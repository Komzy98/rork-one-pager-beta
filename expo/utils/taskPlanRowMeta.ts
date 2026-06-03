import type { Task } from '@/types/task';

export function isTaskOverdue(task: Task, isCompleted: boolean): boolean {
  if (isCompleted || task.isHabit || !task.dueDate) return false;
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  const dueEnd = new Date(task.dueDate);
  dueEnd.setHours(23, 59, 59, 999);
  return dueEnd.getTime() < Date.now();
}

export function getSubtaskProgress(task: Task): { done: number; total: number } | null {
  if (!task.subTasks?.length) return null;
  const done = task.subTasks.filter((s) => s.completed).length;
  return { done, total: task.subTasks.length };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatTaskDueLabel(task: Task, now = new Date()): string | null {
  if (task.isHabit || !task.dueDate) return null;

  const due = new Date(task.dueDate);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowEnd = endOfDay(new Date(todayStart.getTime() + 86400000));

  if (due < todayStart) {
    const days = Math.ceil((todayStart.getTime() - due.getTime()) / 86400000);
    return days <= 1 ? 'Overdue yesterday' : `Overdue ${days}d`;
  }
  if (due <= todayEnd) {
    return `Due today · ${due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (due <= tomorrowEnd) {
    return 'Due tomorrow';
  }
  return `Due ${due.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export interface PlanRowMetaLine {
  text: string;
  tone?: 'default' | 'overdue' | 'muted';
}

export function buildPlanRowMetaLines(
  task: Task,
  isCompleted: boolean,
  baseMeta: string,
): PlanRowMetaLine[] {
  const lines: PlanRowMetaLine[] = [];
  const overdue = isTaskOverdue(task, isCompleted);
  const dueLabel = formatTaskDueLabel(task);

  if (isCompleted && task.completedAt) {
    lines.push({
      text: `Completed ${new Date(task.completedAt).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })}`,
      tone: 'muted',
    });
  }

  if (dueLabel) {
    lines.push({
      text: dueLabel,
      tone: overdue ? 'overdue' : 'default',
    });
  }

  const subtasks = getSubtaskProgress(task);
  if (subtasks) {
    lines.push({
      text: `${subtasks.done}/${subtasks.total} subtasks`,
      tone: 'muted',
    });
  }

  if (baseMeta) {
    lines.push({ text: baseMeta, tone: 'muted' });
  }

  return lines;
}
