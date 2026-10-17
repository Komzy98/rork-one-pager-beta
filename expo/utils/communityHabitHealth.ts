import type { CommunityHabit } from '../types/habit';
import { extractStepTarget } from './stepHabitIntelligence';

/**
 * Only offer Apple Health where its current read-only step integration can
 * actually inform the habit. Category alone is not enough (e.g. nutrition).
 */
export function getAppleHealthStepHabit(
  habit: Pick<CommunityHabit, 'name' | 'description' | 'tags' | 'category'>,
): { target: number | null } | null {
  const target = extractStepTarget({
    title: habit.name,
    description: habit.description,
    tags: habit.tags,
  });

  if (target !== null) return { target };

  const walkingHabit = /\b(?:walk|walking|pedometer|step count|daily steps)\b/i.test(
    [habit.name, ...(habit.tags ?? [])].join(' '),
  );
  if (walkingHabit && (habit.category === 'Fitness' || habit.category === 'Health')) {
    return { target: null };
  }
  return null;
}
