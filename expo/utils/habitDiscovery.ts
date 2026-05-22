import { COMMUNITY_HABITS } from '@/mocks/communityHabits';
import { getForYouRecommendations } from '@/mocks/habitBundles';
import type { CommunityHabit } from '@/types/habit';
import { shouldDoHabitToday } from '@/utils/dateUtils';

export function isCommunityHabitScheduledToday(habit: CommunityHabit): boolean {
  return shouldDoHabitToday({
    type: habit.frequency.type,
    days: habit.frequency.days,
    timesPerWeek: habit.frequency.timesPerWeek,
  });
}

/** Picks for Overview — prioritizes habits due today, then For You / trending. */
export function getTodayHabitSuggestions(
  userHabits: { category?: string; tags?: string[] }[],
  savedCommunityIds: string[],
  limit = 4
): CommunityHabit[] {
  const pool = getForYouRecommendations(userHabits, savedCommunityIds);
  const unsaved = pool.filter((h) => !savedCommunityIds.includes(h.id));

  const dueToday = unsaved.filter(isCommunityHabitScheduledToday);
  const other = unsaved.filter((h) => !dueToday.some((d) => d.id === h.id));

  let merged = [...dueToday, ...other];

  if (merged.length < limit) {
    const extras = COMMUNITY_HABITS.filter(
      (h) =>
        !savedCommunityIds.includes(h.id) &&
        isCommunityHabitScheduledToday(h) &&
        !merged.some((m) => m.id === h.id)
    )
      .sort((a, b) => b.saves - a.saves)
      .slice(0, limit - merged.length);
    merged = [...merged, ...extras];
  }

  return merged.slice(0, limit);
}

export function getFrequencyLabel(days: number[]): string {
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return `${days.length}x/week`;
}
