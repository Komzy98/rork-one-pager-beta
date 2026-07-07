import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferJoySources,
  mergeJoySources,
  parseJoySourceInput,
  resolveEffectiveJoySources,
} from '@/utils/joySources';
import type { UserProfile } from '@/types/habit';
import type { Task } from '@/types/task';

describe('joySources', () => {
  it('parses comma and newline separated values', () => {
    assert.deepEqual(parseJoySourceInput('The Boys, Succession\nBreaking Bad'), [
      'The Boys',
      'Succession',
      'Breaking Bad',
    ]);
  });

  it('infers watching shows and gym habits', () => {
    const profile = {
      interests: ['ufc', 'football'],
      favoriteTeams: [{ id: '1', name: 'Arsenal', league: 'PL' }],
    } as unknown as UserProfile;

    const inferred = inferJoySources({
      profile,
      shows: [{ id: 's1', title: 'The Boys', status: 'Watching' } as any],
      habitTasks: [
        { isHabit: true, title: 'Morning Gym', description: '' } as Task,
      ],
    });

    assert.ok(inferred.tvShows?.includes('The Boys'));
    assert.ok(inferred.exerciseTypes?.some((e) => e.includes('gym')));
    assert.ok(inferred.games?.includes('UFC fight nights'));
  });

  it('merges manual sources ahead of inferred duplicates', () => {
    const manual = { tvShows: ['The Boys'] };
    const inferred = { tvShows: ['The Boys', 'Succession'], music: ['Fred again..'] };
    const merged = mergeJoySources(manual, inferred);
    assert.deepEqual(merged.tvShows, ['The Boys', 'Succession']);
    assert.deepEqual(merged.music, ['Fred again..']);
  });

  it('resolveEffectiveJoySources unions profile and inferred', () => {
    const effective = resolveEffectiveJoySources({
      profile: {
        joySources: { youtubers: ['MKBHD'] },
      } as UserProfile,
      shows: [{ id: '1', title: 'The Boys', status: 'Watching' } as any],
    });
    assert.ok(effective.youtubers?.includes('MKBHD'));
    assert.ok(effective.tvShows?.includes('The Boys'));
  });
});
