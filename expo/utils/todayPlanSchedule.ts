import type { ChronotypeInfo } from '@/types/habit';
import type { Task } from '@/types/task';

export type TimeBlockId = 'morning' | 'afternoon' | 'evening' | 'night';

export type TodayPlanItemKind = 'task' | 'habit';

export interface TodayPlanItem {
  id: string;
  kind: TodayPlanItemKind;
  task: Task;
  isCompleted: boolean;
  timeBlockId: TimeBlockId;
}

export type TodaySourceFilter = 'all' | 'tasks' | 'habits';
export type TodayStatusFilter = 'open' | 'done';
export type TodayDoneScope = 'today' | 'week';

export function getStartOfWeek(date = new Date()): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekDateKeysThroughToday(): string[] {
  const keys: string[] = [];
  const cursor = getStartOfWeek();
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  while (cursor <= today) {
    keys.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function countHabitCompletionsInWeek(habit: Task, weekKeys: string[]): number {
  if (!habit.habitCompletions) return 0;
  return weekKeys.filter((key) => habit.habitCompletions?.[key]).length;
}

function hourToBlock(hour: number): TimeBlockId {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function peakBlockForChronotype(chrono: ChronotypeInfo): TimeBlockId {
  const peakStart = chrono.peakHours.start;
  if (peakStart >= 6 && peakStart < 12) return 'morning';
  if (peakStart >= 12 && peakStart < 17) return 'afternoon';
  if (peakStart >= 17 && peakStart < 21) return 'evening';
  return 'night';
}

function defaultHabitBlock(chrono?: ChronotypeInfo): TimeBlockId {
  if (!chrono) return 'morning';
  switch (chrono.id) {
    case 'lion':
      return 'morning';
    case 'wolf':
      return 'evening';
    case 'dolphin':
      return 'morning';
    case 'bear':
    default:
      return 'morning';
  }
}

export function assignTimeBlock(task: Task, chronoInfo?: ChronotypeInfo): TimeBlockId {
  if (task.dueDate) {
    return hourToBlock(new Date(task.dueDate).getHours());
  }

  if (task.isHabit) {
    return defaultHabitBlock(chronoInfo);
  }

  if (task.priority === 'urgent' || task.priority === 'high') {
    return chronoInfo ? peakBlockForChronotype(chronoInfo) : 'afternoon';
  }

  if (task.priority === 'low') {
    return 'evening';
  }

  return 'morning';
}

export function buildTodayPlanItems(
  allTasks: Task[],
  todayHabits: Task[],
  todayStr: string,
  chronoInfo?: ChronotypeInfo,
): TodayPlanItem[] {
  const items: TodayPlanItem[] = [];

  const openTasks = allTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  openTasks.forEach((task) => {
    items.push({
      id: `task-${task.id}`,
      kind: 'task',
      task,
      isCompleted: false,
      timeBlockId: assignTimeBlock(task, chronoInfo),
    });
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  allTasks
    .filter(
      (t) =>
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt) >= todayStart,
    )
    .forEach((task) => {
      items.push({
        id: `task-done-${task.id}`,
        kind: 'task',
        task,
        isCompleted: true,
        timeBlockId: assignTimeBlock(task, chronoInfo),
      });
    });

  todayHabits.forEach((habit) => {
    const done = !!habit.habitCompletions?.[todayStr];
    items.push({
      id: `habit-${habit.id}`,
      kind: 'habit',
      task: habit,
      isCompleted: done,
      timeBlockId: assignTimeBlock(habit, chronoInfo),
    });
  });

  const blockOrder: TimeBlockId[] = ['morning', 'afternoon', 'evening', 'night'];
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };

  return items.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    const blockDiff = blockOrder.indexOf(a.timeBlockId) - blockOrder.indexOf(b.timeBlockId);
    if (blockDiff !== 0) return blockDiff;
    if (a.kind !== b.kind) {
      return a.kind === 'task' ? -1 : 1;
    }
    return (priorityOrder[b.task.priority] || 0) - (priorityOrder[a.task.priority] || 0);
  });
}

export function filterTodayPlanItems(
  items: TodayPlanItem[],
  source: TodaySourceFilter,
  status: TodayStatusFilter,
): TodayPlanItem[] {
  return items.filter((item) => {
    if (source === 'tasks' && item.kind !== 'task') return false;
    if (source === 'habits' && item.kind !== 'habit') return false;
    if (status === 'open' && item.isCompleted) return false;
    if (status === 'done' && !item.isCompleted) return false;
    return true;
  });
}

export function filterPlanItemsBySource(
  items: TodayPlanItem[],
  source: TodaySourceFilter,
): TodayPlanItem[] {
  return items.filter((item) => {
    if (source === 'tasks' && item.kind !== 'task') return false;
    if (source === 'habits' && item.kind !== 'habit') return false;
    return true;
  });
}

export function countTodayPlanItems(
  items: TodayPlanItem[],
  source: TodaySourceFilter,
  status: TodayStatusFilter,
): number {
  return filterTodayPlanItems(items, source, status).length;
}

export function buildWeekCompletedPlanItems(
  allTasks: Task[],
  allHabits: Task[],
  chronoInfo?: ChronotypeInfo,
): TodayPlanItem[] {
  const weekStart = getStartOfWeek();
  const weekKeys = getWeekDateKeysThroughToday();
  const items: TodayPlanItem[] = [];

  allTasks
    .filter(
      (t) =>
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt) >= weekStart,
    )
    .forEach((task) => {
      items.push({
        id: `week-task-${task.id}`,
        kind: 'task',
        task,
        isCompleted: true,
        timeBlockId: assignTimeBlock(task, chronoInfo),
      });
    });

  allHabits.forEach((habit) => {
    const weekCompletions = countHabitCompletionsInWeek(habit, weekKeys);
    if (weekCompletions === 0) return;
    items.push({
      id: `week-habit-${habit.id}`,
      kind: 'habit',
      task: habit,
      isCompleted: true,
      timeBlockId: assignTimeBlock(habit, chronoInfo),
    });
  });

  return items.sort((a, b) => {
    const aTime =
      a.kind === 'task' && a.task.completedAt
        ? new Date(a.task.completedAt).getTime()
        : 0;
    const bTime =
      b.kind === 'task' && b.task.completedAt
        ? new Date(b.task.completedAt).getTime()
        : 0;
    return bTime - aTime;
  });
}

export function resolveTodayPlanList(
  todayItems: TodayPlanItem[],
  weekDoneItems: TodayPlanItem[],
  source: TodaySourceFilter,
  status: TodayStatusFilter,
  doneScope: TodayDoneScope,
): TodayPlanItem[] {
  if (status === 'open') {
    return filterTodayPlanItems(todayItems, source, 'open');
  }
  const donePool = doneScope === 'week' ? weekDoneItems : todayItems.filter((i) => i.isCompleted);
  return filterPlanItemsBySource(donePool, source);
}

export function countResolvedPlanItems(
  todayItems: TodayPlanItem[],
  weekDoneItems: TodayPlanItem[],
  source: TodaySourceFilter,
  status: TodayStatusFilter,
  doneScope: TodayDoneScope,
): number {
  return resolveTodayPlanList(todayItems, weekDoneItems, source, status, doneScope).length;
}

export function formatTimeBlockSubtitle(
  items: TodayPlanItem[],
  blockId: TimeBlockId,
  maxItems = 2,
): string {
  const inBlock = items.filter((i) => i.timeBlockId === blockId);
  if (inBlock.length === 0) {
    return 'Nothing scheduled';
  }

  const open = inBlock.filter((i) => !i.isCompleted);
  const list = (open.length > 0 ? open : inBlock).slice(0, maxItems);
  const labels = list.map((i) => {
    const prefix = i.kind === 'habit' ? '◦ ' : '';
    return `${prefix}${i.task.title}`;
  });

  const extra = inBlock.length - list.length;
  if (extra > 0) {
    return `${labels.join(' · ')} +${extra} more`;
  }
  return labels.join(' · ');
}

export interface TimeBlockScheduleMeta {
  id: TimeBlockId;
  itemCount: number;
  openCount: number;
  doneCount: number;
}

export function getTimeBlockScheduleMeta(
  items: TodayPlanItem[],
  blockId: TimeBlockId,
): TimeBlockScheduleMeta {
  const inBlock = items.filter((i) => i.timeBlockId === blockId);
  return {
    id: blockId,
    itemCount: inBlock.length,
    openCount: inBlock.filter((i) => !i.isCompleted).length,
    doneCount: inBlock.filter((i) => i.isCompleted).length,
  };
}
