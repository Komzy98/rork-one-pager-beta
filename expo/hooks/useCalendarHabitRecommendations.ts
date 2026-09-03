import { useCallback, useMemo } from 'react';
import { useEventKit } from '@/hooks/useEventKit';
import { useHealthContext } from '@/contexts/HealthContext';
import type { ChronotypeInfo } from '@/types/habit';
import type { Task } from '@/types/task';
import {
  buildSemanticHabitRecommendations,
  getNextSemanticRecommendation,
  type SemanticHabitRecommendation,
} from '@/utils/semanticHabitRecommendations';

export function useCalendarHabitRecommendations(
  incompleteHabits: Task[],
  chronoInfo?: ChronotypeInfo,
) {
  const eventKit = useEventKit();
  const health = useHealthContext();

  const isConnected =
    eventKit.isEventKitAvailable &&
    eventKit.hasPermission &&
    eventKit.selectedCalendarIds.length > 0;

  const recommendations = useMemo((): SemanticHabitRecommendation[] => {
    const todayEvents = isConnected
      ? eventKit.getTodayEvents().map((event) => ({
          startDate: event.startDate,
          endDate: event.endDate,
          title: event.title,
          allDay: event.allDay,
        }))
      : [];

    return buildSemanticHabitRecommendations(
      incompleteHabits,
      todayEvents,
      chronoInfo,
      new Date(),
      {
        stepsToday: health.stepsToday,
        appleHealthRequested: health.permissionRequested,
      },
    );
  }, [incompleteHabits, chronoInfo, isConnected, eventKit.events, health.stepsToday, health.permissionRequested]);

  const nextRecommendation = useMemo(
    () => getNextSemanticRecommendation(recommendations),
    [recommendations],
  );

  const connectCalendar = useCallback(async (): Promise<boolean> => {
    if (!eventKit.isEventKitAvailable) return false;

    let granted = eventKit.hasPermission;
    if (!granted) {
      granted = await eventKit.requestPermissions();
    }
    if (!granted) return false;

    await eventKit.loadDeviceCalendars({ applyDefaultSelection: true });
    await eventKit.refreshEvents();
    return true;
  }, [eventKit]);

  const recommendationByHabitId = useMemo(() => {
    const map = new Map<string, SemanticHabitRecommendation>();
    recommendations.forEach((rec) => map.set(rec.habitId, rec));
    return map;
  }, [recommendations]);

  return {
    isCalendarAvailable: eventKit.isEventKitAvailable,
    hasPermission: eventKit.hasPermission,
    hasSelectedCalendars: eventKit.selectedCalendarIds.length > 0,
    isConnected,
    isLoading: eventKit.isLoading || health.isLoading,
    recommendations,
    nextRecommendation,
    recommendationByHabitId,
    connectCalendar,
    refreshCalendar: eventKit.refreshEvents,
    todayEventCount: isConnected ? eventKit.getTodayEvents().length : 0,
  };
}
