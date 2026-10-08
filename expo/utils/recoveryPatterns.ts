import type { Task } from '@/types/task';

function ymdOffset(baseYmd: string, days: number): string {
  const [y, m, d] = baseYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function isScheduledOnDate(task: Task, date: Date): boolean {
  const frequency = task.habitFrequency;
  if (!frequency || frequency.type === 'times_per_week') return true;
  return frequency.days.includes(date.getDay());
}

function completionRate(task: Task, endYmd: string, days: number): { done: number; scheduled: number; rate: number } {
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const dayYmd = ymdOffset(endYmd, -i);
    const [year, month, day] = dayYmd.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (!isScheduledOnDate(task, date)) continue;
    scheduled++;
    if (task.habitCompletions?.[dayYmd]) done++;
  }

  return {
    done,
    scheduled,
    rate: scheduled === 0 ? 0 : done / scheduled,
  };
}

/**
 * Returns one evidence-based behavioural pattern for Overview.
 *
 * This function deliberately avoids causal or emotional claims. It only reports
 * a pattern when the user's own completion history supports it.
 */
export function detectRecoveryPatternInsight(
  habitTasks: Task[],
  todayYmd: string
): string | null {
  const habits = habitTasks.filter(
    (task) =>
      task.isHabit &&
      Object.keys(task.habitCompletions ?? {}).length >= 7,
  );
  if (habits.length === 0) return null;

  let best:
    | {
        title: string;
        recent: number;
        prior: number;
        drop: number;
        recentScheduled: number;
        priorScheduled: number;
      }
    | null = null;

  for (const task of habits) {
    const recentWindow = completionRate(task, todayYmd, 7);
    const priorWindow = completionRate(task, ymdOffset(todayYmd, -7), 7);

    // Require enough scheduled opportunities in both windows to avoid noisy claims.
    if (recentWindow.scheduled < 2 || priorWindow.scheduled < 2) continue;
    if (priorWindow.rate < 0.35) continue;

    const drop = priorWindow.rate - recentWindow.rate;
    if (drop < 0.25) continue;

    if (!best || drop > best.drop) {
      best = {
        title: task.title,
        recent: recentWindow.rate,
        prior: priorWindow.rate,
        drop,
        recentScheduled: recentWindow.scheduled,
        priorScheduled: priorWindow.scheduled,
      };
    }
  }

  if (!best) return null;

  const priorPercent = Math.round(best.prior * 100);
  const recentPercent = Math.round(best.recent * 100);
  return `Your “${best.title}” completion rate moved from ${priorPercent}% in the previous 7 days to ${recentPercent}% over the last 7 days.`;
}
