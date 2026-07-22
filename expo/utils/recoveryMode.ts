import type { RecoveryModeState, RecoveryWellbeingLog, UserProfile } from '@/types/habit';
import type { Task } from '@/types/task';
import {
  evaluateRecoverySignals,
  RECOVERY_ENTER_CONSECUTIVE_DAYS,
  RECOVERY_ENTER_SCORE,
  RECOVERY_EXIT_CONSECUTIVE_DAYS,
  RECOVERY_EXIT_SCORE,
  type RecoveryEvaluation,
} from '@/utils/recoverySignals';
import {
  buildDailyHopeCandidates,
  pickDailyHope,
  type DailyHopeCandidate,
  type DailyHopeInput,
} from '@/utils/dailyHope';
import { pickTinyWin } from '@/utils/recoveryTinyWins';

export type RecoveryTimeOfDay = 'morning' | 'afternoon' | 'evening';

export function getRecoveryTimeOfDay(hour = new Date().getHours()): RecoveryTimeOfDay {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function getRecoveryGreeting(
  timeOfDay: RecoveryTimeOfDay,
  userName?: string
): string {
  const name = userName?.trim() || 'there';
  if (timeOfDay === 'morning') {
    return `You've been carrying a lot recently, ${name}. Let's aim for one win today.`;
  }
  if (timeOfDay === 'afternoon') {
    return `Take it gently this afternoon, ${name}. One small step is enough.`;
  }
  return `No pressure tonight, ${name}. Rest counts too.`;
}

export function getRecoveryTimeTip(timeOfDay: RecoveryTimeOfDay): string {
  if (timeOfDay === 'morning') {
    return 'Start with the smallest possible win — momentum can wait.';
  }
  if (timeOfDay === 'afternoon') {
    return 'You usually feel better after a short walk or a change of scene.';
  }
  return 'Be kind to yourself tonight. Small comforts are allowed.';
}

export function pickIdentityReminder(
  profile: UserProfile | null | undefined,
  _habitTasks: Task[],
  todayYmd: string
): string | null {
  const goals: string[] = [...(profile?.identityGoals ?? [])].filter((g) => g.trim());
  if (goals.length === 0) {
    return 'Remember why you started — the person you\'re becoming is still in you.';
  }
  let hash = 0;
  for (let i = 0; i < todayYmd.length; i++) {
    hash = (hash * 17 + todayYmd.charCodeAt(i)) >>> 0;
  }
  return `Remember why you started: ${goals[hash % goals.length]}`;
}

export function isRecoverySnoozed(state: RecoveryModeState | undefined, todayYmd: string): boolean {
  if (!state?.snoozedUntil) return false;
  return todayYmd <= state.snoozedUntil;
}

export function applyRecoveryEvaluation(
  current: RecoveryModeState | undefined,
  evaluation: RecoveryEvaluation,
  todayYmd: string,
  nowIso: string
): RecoveryModeState {
  const prev = current ?? { active: false };
  if (prev.reason === 'manual' && prev.active) {
    return {
      ...prev,
      score: evaluation.score,
      signals: evaluation.signals,
      lastScore: evaluation.score,
      lastScoreDate: todayYmd,
      lastEvaluatedAt: nowIso,
    };
  }

  if (isRecoverySnoozed(prev, todayYmd)) {
    return {
      ...prev,
      score: evaluation.score,
      signals: evaluation.signals,
      lastScore: evaluation.score,
      lastScoreDate: todayYmd,
      lastEvaluatedAt: nowIso,
    };
  }

  const sameDay = prev.lastScoreDate === todayYmd;
  const highDay =
    evaluation.score >= RECOVERY_ENTER_SCORE
      ? (sameDay ? (prev.consecutiveHighScoreDays ?? 1) : (prev.consecutiveHighScoreDays ?? 0) + 1)
      : 0;
  const lowDay =
    evaluation.score < RECOVERY_EXIT_SCORE
      ? (sameDay ? (prev.consecutiveLowScoreDays ?? 1) : (prev.consecutiveLowScoreDays ?? 0) + 1)
      : 0;

  let active = prev.active;
  let reason = prev.reason;
  let enteredAt = prev.enteredAt;

  if (!active && highDay >= RECOVERY_ENTER_CONSECUTIVE_DAYS) {
    active = true;
    reason = 'auto';
    enteredAt = nowIso;
  }

  if (active && reason !== 'manual' && lowDay >= RECOVERY_EXIT_CONSECUTIVE_DAYS) {
    active = false;
    reason = undefined;
    enteredAt = undefined;
  }

  return {
    ...prev,
    active,
    reason,
    enteredAt,
    score: evaluation.score,
    signals: evaluation.signals,
    consecutiveHighScoreDays: highDay,
    consecutiveLowScoreDays: active ? lowDay : 0,
    lastScore: evaluation.score,
    lastScoreDate: todayYmd,
    lastEvaluatedAt: nowIso,
  };
}

export function enterRecoveryModeManual(
  current: RecoveryModeState | undefined,
  nowIso: string
): RecoveryModeState {
  return {
    ...(current ?? {}),
    active: true,
    reason: 'manual',
    enteredAt: nowIso,
    signals: ['manual'],
    score: 100,
    consecutiveHighScoreDays: RECOVERY_ENTER_CONSECUTIVE_DAYS,
    consecutiveLowScoreDays: 0,
    snoozedUntil: undefined,
  };
}

export function exitRecoveryMode(
  current: RecoveryModeState | undefined,
  snoozeDays = 0,
  todayYmd?: string
): RecoveryModeState {
  const snoozedUntil =
    snoozeDays > 0 && todayYmd
      ? (() => {
          const [y, m, d] = todayYmd.split('-').map(Number);
          const dt = new Date(y, m - 1, d);
          dt.setDate(dt.getDate() + snoozeDays);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        })()
      : undefined;

  return {
    ...(current ?? { active: false }),
    active: false,
    reason: undefined,
    enteredAt: undefined,
    consecutiveHighScoreDays: 0,
    consecutiveLowScoreDays: 0,
    snoozedUntil,
  };
}

export function resolveRecoveryContent(
  profile: UserProfile | null | undefined,
  habitTasks: Task[],
  hopeInput: DailyHopeInput,
  todayYmd: string
): {
  dailyHope: DailyHopeCandidate | null;
  dailyWin: string;
  identityReminder: string | null;
} {
  const state = profile?.recoveryMode;
  const candidates = buildDailyHopeCandidates(hopeInput);
  const pickedHope = pickDailyHope(candidates, todayYmd);
  const hopeHeadline =
    state?.dailyHope && state.dailyHopeDate === todayYmd
      ? state.dailyHope
      : pickedHope?.headline ?? null;

  const dailyWin = pickTinyWin(
    todayYmd,
    habitTasks,
    state?.dailyWin,
    state?.dailyWinDate
  );

  return {
    dailyHope: hopeHeadline
      ? {
          id: 'resolved',
          headline: hopeHeadline,
          kind: pickedHope?.kind ?? 'interest',
          priority: pickedHope?.priority ?? 0,
        }
      : null,
    dailyWin,
    identityReminder: pickIdentityReminder(profile, habitTasks, todayYmd),
  };
}

export function evaluateAndMergeRecoveryState(
  profile: UserProfile | null | undefined,
  allTasks: Task[],
  todayYmd: string,
  hopeInput: DailyHopeInput
): Partial<UserProfile> | null {
  const habitTasks = allTasks.filter((t) => t.isHabit);
  const evaluation = evaluateRecoverySignals({
    todayYmd,
    habitTasks,
    allTasks,
  });

  const nowIso = new Date().toISOString();
  const nextState = applyRecoveryEvaluation(profile?.recoveryMode, evaluation, todayYmd, nowIso);
  const content = resolveRecoveryContent(profile, habitTasks, hopeInput, todayYmd);

  const withContent: RecoveryModeState = {
    ...nextState,
    dailyWin: content.dailyWin,
    dailyWinDate: todayYmd,
    dailyHope: content.dailyHope?.headline,
    dailyHopeDate: content.dailyHope ? todayYmd : nextState.dailyHopeDate,
  };

  const prev = profile?.recoveryMode;
  const changed =
    !prev ||
    prev.active !== withContent.active ||
    prev.score !== withContent.score ||
    prev.dailyWin !== withContent.dailyWin ||
    prev.dailyHope !== withContent.dailyHope ||
    prev.lastScoreDate !== withContent.lastScoreDate;

  if (!changed) return null;
  return { recoveryMode: withContent };
}

export function upsertWellbeingLog(
  logs: RecoveryWellbeingLog[] | undefined,
  todayYmd: string,
  patch: Partial<Omit<RecoveryWellbeingLog, 'date'>>
): RecoveryWellbeingLog[] {
  const existing = logs ?? [];
  const idx = existing.findIndex((l) => l.date === todayYmd);
  if (idx === -1) {
    return [...existing, { date: todayYmd, ...patch }];
  }
  const next = [...existing];
  next[idx] = { ...next[idx], ...patch };
  return next;
}

export function getTodayWellbeingLog(
  logs: RecoveryWellbeingLog[] | undefined,
  todayYmd: string
): RecoveryWellbeingLog | undefined {
  return logs?.find((l) => l.date === todayYmd);
}
