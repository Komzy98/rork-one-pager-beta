import type { Task } from '@/types/task';

function ymdOffset(baseYmd: string, days: number): string {
  const [y, m, d] = baseYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function completionRate(task: Task, endYmd: string, days: number): number {
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const ymd = ymdOffset(endYmd, -i);
    scheduled++;
    if (task.habitCompletions?.[ymd]) done++;
  }
  return scheduled === 0 ? 0 : done / scheduled;
}

/** One gentle pattern insight when habit attendance drops recently. */
export function detectRecoveryPatternInsight(
  habitTasks: Task[],
  todayYmd: string
): string | null {
  const habits = habitTasks.filter((t) => t.isHabit && Object.keys(t.habitCompletions ?? {}).length >= 7);
  if (habits.length === 0) return null;

  let best: { title: string; drop: number } | null = null;

  for (const task of habits) {
    const recent = completionRate(task, todayYmd, 7);
    const prior = completionRate(task, ymdOffset(todayYmd, -7), 7);
    if (prior < 0.35) continue;
    const drop = prior - recent;
    if (drop < 0.25) continue;
    if (!best || drop > best.drop) {
      best = { title: task.title, drop };
    }
  }

  if (!best) {
    const walkLike = habits.find((t) => /walk|steps|outside/i.test(t.title));
    if (walkLike) {
      return 'You usually feel better after a walk — even ten minutes counts.';
    }
    return null;
  }

  const label = best.title.toLowerCase();
  if (/gym|lift|workout|train/i.test(label)) {
    return 'Whenever things get heavy, your gym attendance often dips first — that\'s a signal, not a failure.';
  }
  if (/walk|steps|outside/i.test(label)) {
    return 'You usually feel better after a walk — it\'s okay if that\'s the only win today.';
  }

  return `When life gets loud, "${best.title}" is often the first thing to slip — be gentle with yourself around it.`;
}
