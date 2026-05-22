import { unifiedStorage } from '@/utils/unifiedStorage';
import type { DailySummary } from '@/utils/dailySummary';

export type DailyStatsSnapshot = {
  date: string;
  completedHabits: number;
  totalHabits: number;
  completedTasks: number;
  totalTasks: number;
  habitCompletionRate: number;
  summaryScore?: number;
};

export type DailyStatsDelta = {
  habitsLabel: string;
  tasksLabel: string | null;
  scoreLabel: string | null;
  improved: boolean;
};

const statsKey = (userId: string, date: string) => `@daily_stats_${userId}_${date}`;
const summaryCacheKey = (userId: string, date: string) => `@daily_summary_cache_${userId}_${date}`;
const autoEnabledKey = (userId: string) => `@daily_summary_auto_enabled_${userId}`;
const autoTimeKey = (userId: string) => `@daily_summary_time_${userId}`;
const autoNotifyKey = (userId: string) => `@daily_summary_notify_${userId}`;
const dismissedKey = (userId: string, date: string) => `@daily_summary_dismissed_${userId}_${date}`;
const autoSummaryHintDismissedKey = (userId: string) => `@auto_summary_hint_dismissed_${userId}`;

export const DEFAULT_AUTO_SUMMARY_HOUR = 20;
export const DEFAULT_AUTO_SUMMARY_MINUTE = 0;

export type AutoSummarySchedule = {
  hour: number;
  minute: number;
  notifyEnabled: boolean;
};

export function getTodayYmd(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayYmd(todayYmd: string): string {
  const [y, m, d] = todayYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return getTodayYmd(dt);
}

export async function saveDailyStatsSnapshot(
  userId: string,
  snapshot: DailyStatsSnapshot
): Promise<void> {
  await unifiedStorage.setItem(statsKey(userId, snapshot.date), JSON.stringify(snapshot));
}

export async function loadDailyStatsSnapshot(
  userId: string,
  dateYmd: string
): Promise<DailyStatsSnapshot | null> {
  try {
    const raw = await unifiedStorage.getItem(statsKey(userId, dateYmd));
    if (!raw) return null;
    return JSON.parse(raw) as DailyStatsSnapshot;
  } catch {
    return null;
  }
}

export async function loadYesterdayStats(
  userId: string,
  todayYmd: string
): Promise<DailyStatsSnapshot | null> {
  return loadDailyStatsSnapshot(userId, getYesterdayYmd(todayYmd));
}

export function computeStatsDelta(
  today: DailyStatsSnapshot,
  yesterday: DailyStatsSnapshot | null
): DailyStatsDelta | null {
  if (!yesterday) return null;

  const habitDiff = today.completedHabits - yesterday.completedHabits;
  const habitRateDiff = today.habitCompletionRate - yesterday.habitCompletionRate;
  const taskDiff = today.completedTasks - yesterday.completedTasks;

  let habitsLabel = `Habits ${today.completedHabits}/${today.totalHabits}`;
  if (habitDiff > 0) {
    habitsLabel += ` · +${habitDiff} vs yesterday`;
  } else if (habitDiff < 0) {
    habitsLabel += ` · ${habitDiff} vs yesterday`;
  } else if (habitRateDiff !== 0 && today.totalHabits === yesterday.totalHabits) {
    habitsLabel += ` · ${habitRateDiff > 0 ? '+' : ''}${habitRateDiff}% completion`;
  } else {
    habitsLabel += ' · same pace as yesterday';
  }

  let tasksLabel: string | null = null;
  if (today.totalTasks > 0 || yesterday.totalTasks > 0) {
    tasksLabel = `Tasks ${today.completedTasks}/${today.totalTasks}`;
    if (taskDiff > 0) tasksLabel += ` · +${taskDiff} vs yesterday`;
    else if (taskDiff < 0) tasksLabel += ` · ${taskDiff} vs yesterday`;
  }

  let scoreLabel: string | null = null;
  if (today.summaryScore != null && yesterday.summaryScore != null) {
    const sd = today.summaryScore - yesterday.summaryScore;
    scoreLabel =
      sd > 0 ? `Score +${sd} vs yesterday` : sd < 0 ? `Score ${sd} vs yesterday` : 'Score matched yesterday';
  }

  const improved =
    habitDiff > 0 ||
    taskDiff > 0 ||
    habitRateDiff > 0 ||
    (today.summaryScore != null &&
      yesterday.summaryScore != null &&
      today.summaryScore > yesterday.summaryScore);

  return { habitsLabel, tasksLabel, scoreLabel, improved };
}

export async function saveDailySummaryCache(
  userId: string,
  dateYmd: string,
  summary: DailySummary
): Promise<void> {
  await unifiedStorage.setItem(summaryCacheKey(userId, dateYmd), JSON.stringify(summary));
}

export async function loadDailySummaryCache(
  userId: string,
  dateYmd: string
): Promise<DailySummary | null> {
  try {
    const raw = await unifiedStorage.getItem(summaryCacheKey(userId, dateYmd));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailySummary;
    return parsed?.date === dateYmd ? parsed : parsed;
  } catch {
    return null;
  }
}

export async function isAutoSummaryEnabled(userId: string): Promise<boolean> {
  const raw = await unifiedStorage.getItem(autoEnabledKey(userId));
  if (raw === null) return true;
  return raw !== 'false';
}

export async function setAutoSummaryEnabled(userId: string, enabled: boolean): Promise<void> {
  await unifiedStorage.setItem(autoEnabledKey(userId), enabled ? 'true' : 'false');
}

export async function getAutoSummarySchedule(userId: string): Promise<AutoSummarySchedule> {
  let hour = DEFAULT_AUTO_SUMMARY_HOUR;
  let minute = DEFAULT_AUTO_SUMMARY_MINUTE;
  try {
    const rawTime = await unifiedStorage.getItem(autoTimeKey(userId));
    if (rawTime) {
      const parsed = JSON.parse(rawTime) as { hour?: number; minute?: number };
      if (typeof parsed.hour === 'number' && parsed.hour >= 0 && parsed.hour <= 23) {
        hour = parsed.hour;
      }
      if (typeof parsed.minute === 'number' && parsed.minute >= 0 && parsed.minute <= 59) {
        minute = parsed.minute;
      }
    }
  } catch {
    // keep defaults
  }

  const notifyRaw = await unifiedStorage.getItem(autoNotifyKey(userId));
  const notifyEnabled = notifyRaw === null ? true : notifyRaw === 'true';

  return { hour, minute, notifyEnabled };
}

export async function setAutoSummaryTime(
  userId: string,
  hour: number,
  minute: number
): Promise<void> {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  await unifiedStorage.setItem(autoTimeKey(userId), JSON.stringify({ hour: h, minute: m }));
}

export async function setDailySummaryNotifyEnabled(
  userId: string,
  enabled: boolean
): Promise<void> {
  await unifiedStorage.setItem(autoNotifyKey(userId), enabled ? 'true' : 'false');
}

export function formatAutoSummaryTime(
  hour: number,
  minute: number,
  timeFormat: '12h' | '24h' = '12h'
): string {
  if (timeFormat === '24h') {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

export async function isDailySummaryDismissed(
  userId: string,
  dateYmd: string
): Promise<boolean> {
  const raw = await unifiedStorage.getItem(dismissedKey(userId, dateYmd));
  return raw === 'true';
}

export async function markDailySummaryDismissed(
  userId: string,
  dateYmd: string
): Promise<void> {
  await unifiedStorage.setItem(dismissedKey(userId, dateYmd), 'true');
}

export async function clearDailySummaryDismissed(
  userId: string,
  dateYmd: string
): Promise<void> {
  await unifiedStorage.removeItem(dismissedKey(userId, dateYmd));
}

export async function isAutoSummaryHintDismissed(userId: string): Promise<boolean> {
  const raw = await unifiedStorage.getItem(autoSummaryHintDismissedKey(userId));
  return raw === 'true';
}

export async function dismissAutoSummaryHint(userId: string): Promise<void> {
  await unifiedStorage.setItem(autoSummaryHintDismissedKey(userId), 'true');
}

export function shouldRunAutoSummaryNow(
  now: Date = new Date(),
  targetHour: number = DEFAULT_AUTO_SUMMARY_HOUR,
  targetMinute: number = DEFAULT_AUTO_SUMMARY_MINUTE
): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetHour * 60 + targetMinute;
  return nowMinutes >= targetMinutes;
}

export function buildOpenItemsForSummary(params: {
  habitIncompleteNames?: string[];
  priorityTasks?: { title: string; completed: boolean }[];
  tasks?: { name: string; completed: boolean; priority?: string }[];
}): string[] {
  const items: string[] = [];
  for (const name of params.habitIncompleteNames ?? []) {
    if (name.trim()) items.push(name.trim());
  }
  for (const p of params.priorityTasks ?? []) {
    if (!p.completed && p.title.trim()) items.push(p.title.trim());
  }
  for (const t of params.tasks ?? []) {
    if (!t.completed && (t.priority === 'urgent' || t.priority === 'high') && t.name.trim()) {
      items.push(t.name.trim());
    }
  }
  return [...new Set(items)].slice(0, 6);
}
