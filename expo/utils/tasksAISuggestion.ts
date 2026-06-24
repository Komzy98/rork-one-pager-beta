import {
  getChronotypeGreetingTip,
  getChronotypePeakLabel,
  getSecondaryPeakHours,
} from '@/constants/chronotypes';
import type { ChronotypeInfo } from '@/types/habit';
import type { Task } from '@/types/task';

export type TasksAIAction =
  | { type: 'none' }
  | { type: 'focus_task'; taskId: string }
  | { type: 'complete_habit'; habitId: string }
  | { type: 'edit_task'; taskId: string }
  | { type: 'create_task' };

export interface TasksAISuggestion {
  message: string;
  emphasis: string;
  action: TasksAIAction;
}

export interface TasksAISuggestionInput {
  chronoInfo?: ChronotypeInfo;
  inPeak: boolean;
  inSecondaryPeak: boolean;
  focusTask: Task | null;
  pendingTasks: Task[];
  todayHabits: Task[];
  todayStr: string;
  momentumPercent: number;
  totalCompletedToday: number;
  pendingCount: number;
  activeFocusTask: Task | null;
  activeTimerStartTime?: string | null;
  calendarConnected?: boolean;
  nextHabitTimeLabel?: string | null;
  nextHabitTitle?: string | null;
}

function quoteTitle(title: string): string {
  return `"${title}"`;
}

function build(
  message: string,
  emphasis: string,
  action: TasksAIAction = { type: 'none' },
): TasksAISuggestion {
  return { message, emphasis, action };
}

function getOverdueTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks
    .filter((t) => t.dueDate && new Date(t.dueDate) < now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
}

function getIncompleteHabitsToday(habits: Task[], todayStr: string): Task[] {
  return habits.filter((h) => !h.habitCompletions?.[todayStr]);
}

function hoursUntilPeakStart(chronoInfo: ChronotypeInfo): number {
  const hour = new Date().getHours();
  let until = chronoInfo.peakHours.start - hour;
  if (until <= 0) until += 24;
  return until;
}

function formatSecondaryPeakLabel(chronoInfo: ChronotypeInfo): string | null {
  const secondary = getSecondaryPeakHours(chronoInfo);
  if (!secondary) return null;
  const formatHour = (h: number) => {
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };
  return `${formatHour(secondary.start)} – ${formatHour(secondary.end)}`;
}

function pickEmphasisTask(
  focusTask: Task | null,
  pendingTasks: Task[],
): Task | null {
  if (focusTask) return focusTask;
  return pendingTasks[0] ?? null;
}

export function getTasksAISuggestion(input: TasksAISuggestionInput): TasksAISuggestion {
  const {
    chronoInfo,
    inPeak,
    inSecondaryPeak,
    focusTask,
    pendingTasks,
    todayHabits,
    todayStr,
    momentumPercent,
    totalCompletedToday,
    pendingCount,
    activeFocusTask,
    activeTimerStartTime,
    calendarConnected,
    nextHabitTimeLabel,
    nextHabitTitle,
  } = input;

  if (activeFocusTask && activeTimerStartTime) {
    const elapsedMin = Math.max(
      0,
      Math.floor((Date.now() - new Date(activeTimerStartTime).getTime()) / 60000),
    );
    const message =
      elapsedMin > 0
        ? `Focus session on ${quoteTitle(activeFocusTask.title)} — ${elapsedMin} min in.`
        : `Focus session started on ${quoteTitle(activeFocusTask.title)}.`;
    return build(message, 'Stay with this block until you hit a natural pause.');
  }

  const incompleteHabits = getIncompleteHabitsToday(todayHabits, todayStr);
  const overdueTasks = getOverdueTasks(pendingTasks);

  if (
    calendarConnected &&
    nextHabitTimeLabel &&
    nextHabitTitle &&
    incompleteHabits.length > 0 &&
    !activeFocusTask
  ) {
    const habit =
      incompleteHabits.find((h) => h.title === nextHabitTitle) ?? incompleteHabits[0];
    return build(
      `Your calendar has a good window at ${nextHabitTimeLabel}.`,
      `Ideal time for ${quoteTitle(habit.title)} before your next commitment.`,
      { type: 'complete_habit', habitId: habit.id },
    );
  }

  const completedHabitsToday = todayHabits.length - incompleteHabits.length;
  const nextTask = pickEmphasisTask(focusTask, pendingTasks);

  if (chronoInfo && (inPeak || inSecondaryPeak)) {
    const peakLabel =
      inSecondaryPeak && !inPeak
        ? formatSecondaryPeakLabel(chronoInfo) ?? getChronotypePeakLabel(chronoInfo)
        : getChronotypePeakLabel(chronoInfo);

    const message =
      inSecondaryPeak && !inPeak
        ? `You're in your secondary peak window (${peakLabel}).`
        : `You're in your ${chronoInfo.title.toLowerCase()} peak (${peakLabel}).`;

    if (nextTask) {
      return build(
        message,
        `Tackle ${quoteTitle(nextTask.title)} while your energy is highest.`,
        { type: 'focus_task', taskId: nextTask.id },
      );
    }
    if (incompleteHabits.length > 0) {
      return build(
        message,
        `Finish ${quoteTitle(incompleteHabits[0].title)} — ${completedHabitsToday}/${todayHabits.length} habits done today.`,
        { type: 'complete_habit', habitId: incompleteHabits[0].id },
      );
    }
    if (totalCompletedToday > 0) {
      return build(
        message,
        `Strong day so far: ${totalCompletedToday} completed, ${momentumPercent}% momentum.`,
      );
    }
    return build(message, 'Add a high-impact task to make the most of this window.', {
      type: 'create_task',
    });
  }

  if (chronoInfo) {
    const message = getChronotypeGreetingTip(chronoInfo);

    if (overdueTasks.length > 0) {
      const count = overdueTasks.length;
      const task = overdueTasks[0];
      return build(
        message,
        count === 1
          ? `${quoteTitle(task.title)} is overdue — handle it first.`
          : `${count} tasks overdue — start with ${quoteTitle(task.title)}.`,
        { type: 'focus_task', taskId: task.id },
      );
    }

    if (nextTask) {
      const untilPeak = hoursUntilPeakStart(chronoInfo);
      if (untilPeak <= 3) {
        return build(
          message,
          `Peak in ~${untilPeak}h — queue ${quoteTitle(nextTask.title)} for then.`,
          { type: 'focus_task', taskId: nextTask.id },
        );
      }
      return build(
        message,
        `Save ${quoteTitle(nextTask.title)} for your ${getChronotypePeakLabel(chronoInfo)} peak.`,
        { type: 'edit_task', taskId: nextTask.id },
      );
    }

    if (incompleteHabits.length > 0) {
      const left = incompleteHabits.length;
      const habit = incompleteHabits[0];
      return build(
        message,
        left === 1
          ? `1 habit left today: ${quoteTitle(habit.title)}.`
          : `${left} habits left — start with ${quoteTitle(habit.title)}.`,
        { type: 'complete_habit', habitId: habit.id },
      );
    }

    if (totalCompletedToday > 0) {
      return build(message, `${totalCompletedToday} done today · ${momentumPercent}% momentum.`);
    }

    return build(message, 'Add a task to get timing tips based on your chronotype.', {
      type: 'create_task',
    });
  }

  const message =
    pendingCount === 0 && todayHabits.length === 0
      ? 'Nothing on your plate for today yet.'
      : `${totalCompletedToday} completed · ${pendingCount} task${pendingCount === 1 ? '' : 's'} still open.`;

  if (overdueTasks.length > 0) {
    const task = overdueTasks[0];
    return build(
      message,
      `Overdue: ${quoteTitle(task.title)} needs attention.`,
      { type: 'focus_task', taskId: task.id },
    );
  }

  if (nextTask) {
    return build(message, `Up next: ${quoteTitle(nextTask.title)}.`, {
      type: 'focus_task',
      taskId: nextTask.id,
    });
  }

  if (incompleteHabits.length > 0) {
    const habit = incompleteHabits[0];
    return build(message, `Habit due: ${quoteTitle(habit.title)}.`, {
      type: 'complete_habit',
      habitId: habit.id,
    });
  }

  if (totalCompletedToday > 0) {
    return build(message, `You're at ${momentumPercent}% of today's momentum goal.`);
  }

  return build(message, 'Set your chronotype in Profile for peak-hour coaching.');
}
