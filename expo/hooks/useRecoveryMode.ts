import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTasks } from '@/hooks/useTasksStore';
import { getTodayYmd } from '@/utils/dailySummaryStats';
import {
  enterRecoveryModeManual,
  exitRecoveryMode,
  evaluateAndMergeRecoveryState,
  getRecoveryGreeting,
  getRecoveryTimeOfDay,
  getRecoveryTimeTip,
  getTodayWellbeingLog,
  pickIdentityReminder,
  resolveRecoveryContent,
  upsertWellbeingLog,
} from '@/utils/recoveryMode';
import { evaluateRecoverySignals } from '@/utils/recoverySignals';
import type { DailyHopeInput } from '@/utils/dailyHope';
import type { RecoveryWellbeingLog } from '@/types/habit';

export function useRecoveryMode(hopeInput?: DailyHopeInput) {
  const { profile, updateProfile } = useUserProfile();
  const { allTasks } = useTasks();
  const todayYmd = getTodayYmd();
  const evaluatedRef = useRef<string | null>(null);

  const habitTasks = useMemo(
    () => allTasks.filter((t) => t.isHabit),
    [allTasks]
  );

  const evaluation = useMemo(
    () =>
      evaluateRecoverySignals({
        todayYmd,
        habitTasks,
        allTasks,
      }),
    [todayYmd, habitTasks, allTasks]
  );

  useEffect(() => {
    if (!profile || !hopeInput) return;
    const key = `${todayYmd}-${allTasks.length}-${hopeInput.sportsBeats?.length ?? 0}`;
    if (evaluatedRef.current === key) return;
    evaluatedRef.current = key;

    const patch = evaluateAndMergeRecoveryState(profile, allTasks, todayYmd, hopeInput);
    if (patch) updateProfile(patch);
  }, [profile, allTasks, todayYmd, hopeInput, updateProfile]);

  const isActive = profile?.recoveryMode?.active === true;
  const timeOfDay = getRecoveryTimeOfDay();

  const content = useMemo(() => {
    if (!hopeInput) {
      return {
        dailyHope: null,
        dailyWin: profile?.recoveryMode?.dailyWin ?? 'Take one small step today.',
        identityReminder: pickIdentityReminder(profile, habitTasks, todayYmd),
      };
    }
    return resolveRecoveryContent(profile, habitTasks, hopeInput, todayYmd);
  }, [profile, habitTasks, hopeInput, todayYmd]);

  const greeting = useMemo(
    () => getRecoveryGreeting(timeOfDay, profile?.name),
    [timeOfDay, profile?.name]
  );

  const timeTip = useMemo(() => getRecoveryTimeTip(timeOfDay), [timeOfDay]);

  const wellbeingLog = useMemo(
    () => getTodayWellbeingLog(profile?.wellbeingLogs, todayYmd),
    [profile?.wellbeingLogs, todayYmd]
  );

  const enterManual = useCallback(() => {
    updateProfile({
      recoveryMode: enterRecoveryModeManual(profile?.recoveryMode, new Date().toISOString()),
    });
  }, [profile?.recoveryMode, updateProfile]);

  const exitManual = useCallback(
    (snoozeDays = 7) => {
      updateProfile({
        recoveryMode: exitRecoveryMode(profile?.recoveryMode, snoozeDays, todayYmd),
      });
    },
    [profile?.recoveryMode, todayYmd, updateProfile]
  );

  const updateWellbeing = useCallback(
    (patch: Partial<Omit<RecoveryWellbeingLog, 'date'>>) => {
      updateProfile({
        wellbeingLogs: upsertWellbeingLog(profile?.wellbeingLogs, todayYmd, patch),
      });
    },
    [profile?.wellbeingLogs, todayYmd, updateProfile]
  );

  return {
    isActive,
    evaluation,
    recoveryMode: profile?.recoveryMode,
    greeting,
    timeTip,
    timeOfDay,
    dailyHope: content.dailyHope,
    dailyWin: content.dailyWin,
    identityReminder: content.identityReminder,
    wellbeingLog,
    enterManual,
    exitManual,
    updateWellbeing,
  };
}
