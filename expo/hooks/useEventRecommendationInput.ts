import { useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useEventKit } from '@/hooks/useEventKit';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { useTasksSafe } from '@/hooks/useTasksStore';
import { resolveEffectiveJoySources } from '@/utils/joySources';
import { extractHabitKeywords, type EventRecommendationInput } from '@/utils/eventPersonalization';

/** Shared profile, habits, shows, calendar, and save history for event recommendations. */
export function useEventRecommendationInput(
  friendCountByEventId?: Map<string, number>,
): EventRecommendationInput {
  const { profile } = useUserProfile();
  const { savedSnapshots } = useSavedEvents();
  const { events: calendarEvents, hasPermission } = useEventKit();
  const { shows } = useAppSafe();
  const { allTasks } = useTasksSafe();

  const habitTasks = useMemo(() => allTasks.filter((t) => t.isHabit), [allTasks]);

  const effectiveJoySources = useMemo(
    () => resolveEffectiveJoySources({ profile, shows, habitTasks }),
    [profile, shows, habitTasks],
  );

  const habitKeywords = useMemo(() => extractHabitKeywords(habitTasks), [habitTasks]);

  return useMemo(
    () => ({
      profile,
      savedSnapshots,
      effectiveJoySources,
      habitKeywords,
      recoveryModeActive: profile?.recoveryMode?.active === true,
      friendCountByEventId,
      calendarEvents: hasPermission
        ? calendarEvents.map((e) => ({
            startDate: e.startDate,
            endDate: e.endDate,
            allDay: e.allDay,
            title: e.title,
          }))
        : [],
    }),
    [
      profile,
      savedSnapshots,
      effectiveJoySources,
      habitKeywords,
      friendCountByEventId,
      calendarEvents,
      hasPermission,
    ],
  );
}
