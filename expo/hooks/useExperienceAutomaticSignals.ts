import { useEffect, useMemo } from 'react';

import { useAppSafe } from '@/hooks/useHabitsStore';
import { useTasksSafe } from '@/hooks/useTasksStore';
import type { ExperienceFeedbackState, ExperienceSignal } from '@/utils/experienceFeedback';

function time(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestRoutineCompletion(task: ReturnType<typeof useTasksSafe>['allTasks'][number]) {
  const log = [...(task.completionLogs ?? [])]
    .sort((a, b) => time(b.completedAt) - time(a.completedAt))[0];
  if (log?.completedAt) return log.completedAt;

  const latestDate = Object.entries(task.habitCompletions ?? {})
    .filter(([, completed]) => completed)
    .map(([date]) => date)
    .sort()
    .at(-1);
  return latestDate ? `${latestDate}T12:00:00` : null;
}

export function useExperienceAutomaticSignals(params: {
  state: ExperienceFeedbackState;
  record: (signal: ExperienceSignal) => Promise<ExperienceFeedbackState>;
}) {
  const app = useAppSafe();
  const tasks = useTasksSafe();

  const shows = app.shows;
  const routines = useMemo(
    () => tasks.allTasks.filter((task) => task.isHabit),
    [tasks.allTasks],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const signals: ExperienceSignal[] = [];

      for (const show of shows) {
        const entry = params.state.entries[`show:${show.id}`];
        const tags = [show.platform, show.type];
        const chosen = show.status === 'Plan to Watch' || show.status === 'Watching' || show.status === 'Completed';
        if (chosen && (entry?.chosenCount ?? 0) === 0) {
          signals.push({
            kind: 'show',
            subjectId: show.id,
            title: show.title,
            action: 'chosen',
            tags,
            occurredAt: show.createdAt,
            source: 'show-state',
          });
        }
        if (show.status === 'Completed' && (entry?.completedCount ?? 0) === 0) {
          signals.push({
            kind: 'show',
            subjectId: show.id,
            title: show.title,
            action: 'completed',
            tags,
            occurredAt: show.updatedAt || show.createdAt,
            source: 'show-state',
          });
        }
      }

      for (const routine of routines) {
        const completedAt = latestRoutineCompletion(routine);
        if (!completedAt) continue;
        const entry = params.state.entries[`routine:${routine.id}`];
        if (time(entry?.lastCompletedAt) >= time(completedAt)) continue;
        signals.push({
          kind: 'routine',
          subjectId: routine.id,
          title: routine.title,
          action: 'completed',
          tags: [routine.category, ...(routine.tags ?? [])],
          occurredAt: completedAt,
          source: 'routine-state',
        });
      }

      for (const signal of signals) {
        if (cancelled) return;
        await params.record(signal);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.record, params.state.entries, routines, shows]);
}
