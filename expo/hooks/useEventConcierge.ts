import { useEffect, useMemo, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTasksSafe } from '@/hooks/useTasksStore';
import { getCurrentWeather } from '@/utils/weatherApi';
import { evaluateRecoverySignals } from '@/utils/recoverySignals';
import { getTodayYmd } from '@/utils/dailySummaryStats';
import { regionsDifferSignificantly } from '@/utils/eventDiscovery';
import {
  buildConciergeSignals,
  buildEventConciergeNarrative,
  type EventConciergeNarrative,
} from '@/utils/eventConcierge';
import type { EventRecommendationInput } from '@/utils/eventPersonalization';

type Coords = { latitude: number; longitude: number };

export function useEventConcierge(params: {
  recommendationInput: EventRecommendationInput;
  userCoords: Coords | null;
  mapSearchCenter: Coords | null;
  areaLabel?: string | null;
}): EventConciergeNarrative | null {
  const { profile } = useUserProfile();
  const { allTasks } = useTasksSafe();
  const [weather, setWeather] = useState<Awaited<ReturnType<typeof getCurrentWeather>> | null>(null);

  const habitTasks = useMemo(() => allTasks.filter((t) => t.isHabit), [allTasks]);
  const todayYmd = getTodayYmd();

  useEffect(() => {
    const coords = params.mapSearchCenter ?? params.userCoords;
    if (!coords) return;
    let cancelled = false;
    void getCurrentWeather(coords.latitude, coords.longitude).then((data) => {
      if (!cancelled) setWeather(data);
    });
    return () => {
      cancelled = true;
    };
  }, [params.userCoords?.latitude, params.userCoords?.longitude, params.mapSearchCenter?.latitude, params.mapSearchCenter?.longitude]);

  return useMemo(() => {
    const calendarEvents = params.recommendationInput.calendarEvents ?? [];
    const recovery = evaluateRecoverySignals({
      todayYmd,
      habitTasks,
      allTasks,
    });

    const recentLogs = profile?.wellbeingLogs?.slice(-5) ?? [];
    const recentWellbeingMovement =
      recentLogs.length === 0 ? undefined : recentLogs.some((log) => log.movement === true);

    const isSearchingAwayFromHome =
      !!params.userCoords &&
      !!params.mapSearchCenter &&
      regionsDifferSignificantly(params.userCoords, params.mapSearchCenter, 25);

    const { calendarEventsThisWeek } = buildConciergeSignals({ calendarEvents });

    return buildEventConciergeNarrative({
      profileName: profile?.name,
      weather: weather
        ? {
            isRaining: weather.isRaining,
            isStormy: weather.isStormy,
            isSnowing: weather.isSnowing,
            isClear: weather.isClear,
            isDayTime: weather.isDayTime,
            description: weather.description,
          }
        : null,
      calendarEvents,
      habitCompletionRate7d: recovery.habitCompletionRate7d,
      missedHabitDays3d: recovery.missedScheduledDays3d,
      recoveryModeActive: params.recommendationInput.recoveryModeActive,
      recentWellbeingMovement,
      calendarEventsThisWeek,
      isSearchingAwayFromHome,
      travelAreaLabel: isSearchingAwayFromHome ? params.areaLabel ?? undefined : undefined,
    });
  }, [
    params.recommendationInput,
    params.userCoords,
    params.mapSearchCenter,
    params.areaLabel,
    profile?.name,
    profile?.wellbeingLogs,
    habitTasks,
    allTasks,
    todayYmd,
    weather,
  ]);
}
