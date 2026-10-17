import assert from 'node:assert/strict';
import test from 'node:test';
import { getActiveAccountabilityHabitIds } from '../routineCardPresentation';

test('unshared habits do not show the accountability shortcut', () => {
  const ids = getActiveAccountabilityHabitIds(['friend-1'], () => []);
  assert.equal(ids.size, 0);
});

test('shows the shortcut only for habits shared with an approved partner', () => {
  const shares = {
    'friend-1': [{ habitId: 'prayer' }, { habitId: 'steps' }],
    'not-a-friend': [{ habitId: 'workout' }],
  } as Record<string, { habitId: string }[]>;
  const ids = getActiveAccountabilityHabitIds(['friend-1'], id => shares[id] ?? []);
  assert.deepEqual([...ids].sort(), ['prayer', 'steps']);
  assert.equal(ids.has('workout'), false);
});
