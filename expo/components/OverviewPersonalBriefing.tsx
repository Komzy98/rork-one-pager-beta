import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Lightbulb,
  ListChecks,
  Play,
  Radio,
  Sparkles,
  Trophy,
  Tv,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import type { Task } from '@/types/task';
import type { OverviewInterestSignal } from '@/utils/overviewInterestRanking';
import {
  OP_RADIUS,
  OP_SPACING,
  OP_SURFACE,
  OP_TYPE,
} from '@/constants/designSystem';

export interface OverviewCalendarItem {
  id: string;
  title: string;
  startDate: string;
}

interface Props {
  tasks: readonly Task[];
  todayYmd: string;
  calendarItems: readonly OverviewCalendarItem[];
  interestSignals: readonly OverviewInterestSignal[];
  patternInsight?: string | null;
  habitProgress: {
    completed: number;
    total: number;
    rate: number;
  };
  onStartTask: (task: Task) => void;
  onCompleteHabit?: (task: Task) => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenInterest: (signal: OverviewInterestSignal) => void;
  onViewInterests: (signal: OverviewInterestSignal) => void;
  onRemindInterest?: (signal: OverviewInterestSignal) => Promise<boolean>;
  onOpenInsights: () => void;
}

type TimelineItem =
  | {
      id: string;
      kind: 'task';
      title: string;
      timeLabel: string;
      sortTime: number;
      task: Task;
      day: 'today' | 'tomorrow';
    }
  | {
      id: string;
      kind: 'habit';
      title: string;
      timeLabel: string;
      sortTime: number;
      task: Task;
      day: 'today';
    }
  | {
      id: string;
      kind: 'calendar';
      title: string;
      timeLabel: string;
      sortTime: number;
      calendar: OverviewCalendarItem;
      day: 'today' | 'tomorrow';
    };

const PRIORITY_SCORE: Record<Task['priority'], number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function ymd(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function tomorrowYmd(todayYmd: string): string {
  const [year, month, day] = todayYmd.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  return ymd(date);
}

function isHabitScheduledToday(task: Task, now: Date): boolean {
  if (!task.isHabit) return false;
  const frequency = task.habitFrequency;
  if (!frequency) return true;
  if (frequency.type === 'times_per_week') return true;
  return frequency.days.includes(now.getDay());
}

function isHabitCompleteToday(task: Task, todayYmd: string): boolean {
  return Boolean(task.habitCompletions?.[todayYmd]);
}

function parseHabitWindow(todayYmd: string, value?: string): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const [year, month, day] = todayYmd.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Today';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDueLabel(task: Task): string {
  if (!task.dueDate) return 'Open task';
  const date = new Date(task.dueDate);
  if (!Number.isFinite(date.getTime())) return 'Open task';
  const now = new Date();
  const taskYmd = ymd(date);
  const nowYmd = ymd(now);
  if (taskYmd === nowYmd) {
    const hasExplicitTime =
      date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
    return hasExplicitTime ? `Due today · ${formatClock(task.dueDate)}` : 'Due today';
  }
  if (date.getTime() < now.getTime()) return 'Overdue';
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

function pickFocusTask(tasks: readonly Task[], todayYmd: string): Task | null {
  const now = Date.now();
  const candidates = tasks
    .filter((task) => !task.isHabit && task.status !== 'completed' && task.status !== 'cancelled')
    .map((task) => {
      const due = task.dueDate ? new Date(task.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const isDueToday = task.dueDate ? ymd(new Date(task.dueDate)) === todayYmd : false;
      const overdue = Number.isFinite(due) && due < now;
      const statusBoost = task.status === 'in-progress' ? 35 : 0;
      const dueBoost = overdue ? 60 : isDueToday ? 45 : 0;
      const priorityBoost = PRIORITY_SCORE[task.priority] * 12;
      return { task, score: statusBoost + dueBoost + priorityBoost, due };
    })
    .sort((a, b) => b.score - a.score || a.due - b.due);

  const best = candidates[0];
  if (!best || best.score < 36) return null;
  return best.task;
}

function pickNextHabit(
  tasks: readonly Task[],
  todayYmd: string,
): Task | null {
  const now = new Date();
  const nowMs = now.getTime();

  const habits = tasks
    .filter(
      (task) =>
        isHabitScheduledToday(task, now) &&
        !isHabitCompleteToday(task, todayYmd),
    )
    .map((task, index) => {
      const windowTime = parseHabitWindow(todayYmd, task.habitEngine?.windowStart);
      const isUpcoming = windowTime != null && windowTime >= nowMs;
      const sortTime =
        windowTime == null
          ? nowMs + 86_400_000 + index
          : isUpcoming
            ? windowTime
            : windowTime + 43_200_000;
      return { task, sortTime };
    })
    .sort((a, b) => a.sortTime - b.sortTime);

  return habits[0]?.task ?? null;
}

function buildTimeline(
  tasks: readonly Task[],
  calendarItems: readonly OverviewCalendarItem[],
  todayYmd: string,
  focusTaskId?: string,
  focusHabitId?: string,
): TimelineItem[] {
  const now = new Date();
  const tomorrow = tomorrowYmd(todayYmd);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const taskItems: TimelineItem[] = tasks
    .filter(
      (task) =>
        !task.isHabit &&
        task.id !== focusTaskId &&
        task.status !== 'completed' &&
        task.status !== 'cancelled' &&
        Boolean(task.dueDate),
    )
    .flatMap((task) => {
      const due = new Date(task.dueDate!);
      const dueYmd = ymd(due);
      if (dueYmd !== todayYmd && dueYmd !== tomorrow) return [];
      const hasTime =
        due.getHours() !== 0 || due.getMinutes() !== 0 || due.getSeconds() !== 0;
      const day = dueYmd === todayYmd ? 'today' as const : 'tomorrow' as const;
      const clock = hasTime ? formatClock(task.dueDate!) : day === 'today' ? 'Today' : 'Tomorrow';
      return [{
        id: `task:${task.id}`,
        kind: 'task' as const,
        title: task.title,
        timeLabel: day === 'tomorrow' && hasTime ? `Tomorrow · ${clock}` : clock,
        sortTime: hasTime
          ? due.getTime()
          : day === 'today'
            ? todayEnd.getTime() - 2
            : tomorrowEnd.getTime() - 2,
        task,
        day,
      }];
    });

  const habitItems: TimelineItem[] = tasks
    .filter(
      (task) =>
        task.id !== focusHabitId &&
        isHabitScheduledToday(task, now) &&
        !isHabitCompleteToday(task, todayYmd),
    )
    .slice(0, 4)
    .map((task, index) => {
      const windowTime = parseHabitWindow(todayYmd, task.habitEngine?.windowStart);
      return {
        id: `habit:${task.id}`,
        kind: 'habit' as const,
        title: task.title,
        timeLabel: task.habitEngine?.windowStart
          ? task.habitEngine.windowStart.replace(/:00$/, '')
          : 'Anytime',
        sortTime: windowTime ?? todayEnd.getTime() - 1 + index,
        task,
        day: 'today' as const,
      };
    });

  const calendarTimeline: TimelineItem[] = calendarItems
    .flatMap((item) => {
      const start = new Date(item.startDate);
      if (!Number.isFinite(start.getTime())) return [];
      const startYmd = ymd(start);
      if (startYmd !== todayYmd && startYmd !== tomorrow) return [];
      const day = startYmd === todayYmd ? 'today' as const : 'tomorrow' as const;
      return [{
        id: `calendar:${item.id}`,
        kind: 'calendar' as const,
        title: item.title,
        timeLabel:
          day === 'tomorrow'
            ? `Tomorrow · ${formatClock(item.startDate)}`
            : formatClock(item.startDate),
        sortTime: start.getTime(),
        calendar: item,
        day,
      }];
    });

  const combined = [...taskItems, ...habitItems, ...calendarTimeline]
    .sort((a, b) => a.sortTime - b.sortTime);

  const todayItems = combined.filter((item) => item.day === 'today');
  const tomorrowItems = combined.filter((item) => item.day === 'tomorrow');

  return [...todayItems.slice(0, 4), ...tomorrowItems.slice(0, Math.max(0, 5 - todayItems.length))]
    .slice(0, 5);
}

function SignalIcon({ signal, color }: { signal: OverviewInterestSignal; color: string }) {
  if (signal.kind === 'episode') {
    return <Tv size={17} color={color} strokeWidth={2.2} />;
  }
  if (signal.football.kind === 'football_live') {
    return <Radio size={17} color="#EF4444" strokeWidth={2.4} />;
  }
  if (signal.football.kind === 'football_recent_result') {
    return <Trophy size={17} color={color} strokeWidth={2.2} />;
  }
  return <Bell size={17} color={color} strokeWidth={2.2} />;
}

function compactSignalTitle(signal: OverviewInterestSignal): string {
  if (signal.kind === 'episode') {
    return signal.show.showTitle;
  }
  return signal.title;
}

export default function OverviewPersonalBriefing({
  tasks,
  todayYmd,
  calendarItems,
  interestSignals,
  patternInsight,
  habitProgress,
  onStartTask,
  onCompleteHabit,
  onOpenTasks,
  onOpenCalendar,
  onOpenInterest,
  onViewInterests,
  onRemindInterest,
  onOpenInsights,
}: Props) {
  const { colors, isDark } = useTheme();
  const [reminderBusyId, setReminderBusyId] = useState<string | null>(null);
  const [reminderSetIds, setReminderSetIds] = useState<Record<string, boolean>>({});

  const focusTask = useMemo(() => pickFocusTask(tasks, todayYmd), [tasks, todayYmd]);
  const nextHabit = useMemo(
    () => (focusTask ? null : pickNextHabit(tasks, todayYmd)),
    [focusTask, tasks, todayYmd],
  );
  const timeline = useMemo(
    () => buildTimeline(tasks, calendarItems, todayYmd, focusTask?.id, nextHabit?.id),
    [tasks, calendarItems, todayYmd, focusTask?.id, nextHabit?.id],
  );
  const visibleInterests = interestSignals.slice(0, 3);

  const todayTaskStats = useMemo(() => {
    const todayTasks = tasks.filter(
      (task) =>
        !task.isHabit &&
        task.dueDate &&
        ymd(new Date(task.dueDate)) === todayYmd &&
        task.status !== 'cancelled',
    );
    return {
      total: todayTasks.length,
      completed: todayTasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks, todayYmd]);

  const openTaskCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          !task.isHabit &&
          task.status !== 'completed' &&
          task.status !== 'cancelled',
      ).length,
    [tasks],
  );
  const openHabitCount = Math.max(0, habitProgress.total - habitProgress.completed);
  const todayTaskRate =
    todayTaskStats.total > 0
      ? Math.round((todayTaskStats.completed / todayTaskStats.total) * 100)
      : 100;

  const haptic = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };

  const setInterestReminder = async (signal: OverviewInterestSignal) => {
    if (!onRemindInterest || reminderBusyId || reminderSetIds[signal.id]) return;
    haptic();
    setReminderBusyId(signal.id);
    try {
      const success = await onRemindInterest(signal);
      if (success) {
        setReminderSetIds((current) => ({ ...current, [signal.id]: true }));
      }
    } finally {
      setReminderBusyId(null);
    }
  };

  const card = {
    backgroundColor: isDark ? colors.surfaceSecondary : OP_SURFACE.lightCard,
    borderColor: isDark ? colors.border : OP_SURFACE.borderLight,
  };

  const learningCopy =
    openHabitCount > 0
      ? `${openHabitCount} habit${openHabitCount === 1 ? '' : 's'} still open today. Keep logging completions and One Pager will compare your patterns over time.`
      : 'Your habit history is building. One Pager will surface a pattern when the evidence is strong enough.';

  return (
    <View style={styles.root}>
      <View style={styles.snapshotRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            haptic();
            onOpenTasks();
          }}
          style={[styles.snapshotTile, card]}
        >
          <View style={[styles.snapshotIcon, { backgroundColor: 'rgba(16,185,129,0.10)' }]}>
            <CheckCircle2 size={15} color="#10B981" strokeWidth={2.3} />
          </View>
          <Text style={[styles.snapshotValue, { color: colors.text }]}>{openHabitCount}</Text>
          <Text style={[styles.snapshotLabel, { color: colors.textSecondary }]}>habits left</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            haptic();
            onOpenTasks();
          }}
          style={[styles.snapshotTile, card]}
        >
          <View style={[styles.snapshotIcon, { backgroundColor: 'rgba(124,58,237,0.09)' }]}>
            <ListChecks size={15} color="#7C3AED" strokeWidth={2.3} />
          </View>
          <Text style={[styles.snapshotValue, { color: colors.text }]}>{openTaskCount}</Text>
          <Text style={[styles.snapshotLabel, { color: colors.textSecondary }]}>open tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            const first = interestSignals[0];
            if (!first) return;
            haptic();
            onOpenInterest(first);
          }}
          disabled={interestSignals.length === 0}
          style={[styles.snapshotTile, card]}
        >
          <View style={[styles.snapshotIcon, { backgroundColor: 'rgba(79,70,229,0.09)' }]}>
            <Sparkles size={15} color={OP_SURFACE.interest} strokeWidth={2.3} />
          </View>
          <Text style={[styles.snapshotValue, { color: colors.text }]}>{interestSignals.length}</Text>
          <Text style={[styles.snapshotLabel, { color: colors.textSecondary }]}>updates</Text>
        </TouchableOpacity>
      </View>

      {focusTask ? (
        <View style={[styles.focusCard, card]}>
          <View style={styles.sectionKickerRow}>
            <View style={[styles.kickerIcon, { backgroundColor: 'rgba(37,99,235,0.10)' }]}>
              <Sparkles size={14} color={OP_SURFACE.primary} strokeWidth={2.3} />
            </View>
            <Text style={[styles.kicker, { color: OP_SURFACE.primary }]}>MOST IMPORTANT</Text>
          </View>

          <Text style={[styles.focusTitle, { color: colors.text }]} numberOfLines={2}>
            {focusTask.title}
          </Text>

          <View style={styles.focusMeta}>
            <Clock3 size={14} color={colors.textTertiary} />
            <Text style={[styles.focusMetaText, { color: colors.textSecondary }]}>
              {formatDueLabel(focusTask)}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
            <Text style={[styles.focusMetaText, { color: colors.textSecondary }]}>
              {focusTask.priority === 'urgent'
                ? 'Urgent'
                : focusTask.priority === 'high'
                  ? 'High priority'
                  : focusTask.category || 'Task'}
            </Text>
          </View>

          <View style={styles.focusActions}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={() => {
                haptic();
                onStartTask(focusTask);
              }}
              style={styles.startButton}
              testID="overview-focus-start"
            >
              <Play size={15} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startButtonText}>Start now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.72}
              onPress={() => {
                haptic();
                onOpenTasks();
              }}
              style={[
                styles.secondaryButton,
                { backgroundColor: isDark ? colors.surface : OP_SURFACE.lightMuted },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>View task</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : nextHabit ? (
        <View style={[styles.focusCard, card]}>
          <View style={styles.sectionKickerRow}>
            <View style={[styles.kickerIcon, { backgroundColor: 'rgba(16,185,129,0.10)' }]}>
              <CheckCircle2 size={14} color="#10B981" strokeWidth={2.3} />
            </View>
            <Text style={[styles.kicker, { color: '#059669' }]}>NEXT MOVE</Text>
          </View>

          <Text style={[styles.focusTitle, { color: colors.text }]} numberOfLines={2}>
            {nextHabit.title}
          </Text>

          <Text style={[styles.focusHabitCopy, { color: colors.textSecondary }]}>
            {openHabitCount > 1
              ? `One of ${openHabitCount} habits still open today.`
              : 'Your remaining habit for today.'}
          </Text>

          <View style={styles.focusActions}>
            {onCompleteHabit ? (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => {
                  haptic();
                  onCompleteHabit(nextHabit);
                }}
                style={[styles.startButton, { backgroundColor: '#10B981' }]}
              >
                <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.startButtonText}>Done</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.72}
              onPress={() => {
                haptic();
                onOpenTasks();
              }}
              style={[
                styles.secondaryButton,
                { backgroundColor: isDark ? colors.surface : OP_SURFACE.lightMuted },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Open habits</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={[styles.card, card]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Up next</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
              Today first, then a glimpse of tomorrow
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={() => {
              haptic();
              onOpenCalendar();
            }}
            style={styles.headerAction}
          >
            <Text style={[styles.headerActionText, { color: OP_SURFACE.primary }]}>Calendar</Text>
            <ChevronRight size={13} color={OP_SURFACE.primary} />
          </TouchableOpacity>
        </View>

        {timeline.length > 0 ? (
          <View style={styles.timeline}>
            {timeline.map((item, index) => {
              const Icon =
                item.kind === 'calendar'
                  ? Calendar
                  : item.kind === 'habit'
                    ? CheckCircle2
                    : ListChecks;
              const tint =
                item.kind === 'calendar'
                  ? OP_SURFACE.primary
                  : item.kind === 'habit'
                    ? '#10B981'
                    : '#7C3AED';
              return (
                <TouchableOpacity
                  key={item.id}
                  accessibilityRole="button"
                  activeOpacity={0.72}
                  onPress={() => {
                    haptic();
                    if (item.kind === 'calendar') onOpenCalendar();
                    else onOpenTasks();
                  }}
                  style={[
                    styles.timelineRow,
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: isDark ? colors.border : OP_SURFACE.borderLight,
                    },
                  ]}
                >
                  <View style={[styles.timelineIcon, { backgroundColor: `${tint}12` }]}>
                    <Icon size={16} color={tint} strokeWidth={2.2} />
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={[styles.timelineTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.timelineMeta, { color: colors.textSecondary }]}>
                      {item.kind === 'habit' ? 'Habit' : item.kind === 'calendar' ? 'Calendar' : 'Task'}
                    </Text>
                  </View>
                  <Text style={[styles.timelineTime, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.timeLabel}
                  </Text>
                  <ChevronRight size={15} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={() => {
              haptic();
              onOpenTasks();
            }}
            style={styles.emptyAction}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nothing scheduled yet. Add something for later.
            </Text>
            <ChevronRight size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.card, card]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>For you</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
              Sports and shows ranked by relevance
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: isDark ? colors.surface : OP_SURFACE.lightMuted }]}>
            <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
              {interestSignals.length}
            </Text>
          </View>
        </View>

        {visibleInterests.length > 0 ? (
          <View style={styles.interestList}>
            {visibleInterests.map((signal, index) => {
              const canRemind =
                signal.kind === 'football' &&
                signal.football.kind === 'football_upcoming' &&
                Boolean(onRemindInterest);
              const reminderSet = Boolean(reminderSetIds[signal.id]);
              const reminderBusy = reminderBusyId === signal.id;

              return (
                <View
                  key={signal.id}
                  style={[
                    styles.interestRowWrap,
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: isDark ? colors.border : OP_SURFACE.borderLight,
                    },
                  ]}
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    onPress={() => {
                      haptic();
                      onOpenInterest(signal);
                    }}
                    style={styles.interestRow}
                  >
                    <View style={[styles.interestIcon, { backgroundColor: 'rgba(79,70,229,0.08)' }]}>
                      <SignalIcon signal={signal} color={OP_SURFACE.interest} />
                    </View>
                    <View style={styles.interestCopy}>
                      <Text style={[styles.interestTitle, { color: colors.text }]} numberOfLines={1}>
                        {compactSignalTitle(signal)}
                      </Text>
                      <Text style={[styles.interestMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {signal.subtitle}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textTertiary} />
                  </TouchableOpacity>

                  {canRemind ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={reminderBusy || reminderSet}
                      activeOpacity={0.72}
                      onPress={() => void setInterestReminder(signal)}
                      style={[
                        styles.inlineReminder,
                        {
                          backgroundColor: reminderSet
                            ? OP_SURFACE.positive
                            : isDark
                              ? 'rgba(99,102,241,0.16)'
                              : 'rgba(79,70,229,0.08)',
                        },
                      ]}
                    >
                      {reminderBusy ? (
                        <ActivityIndicator size="small" color={OP_SURFACE.interest} />
                      ) : reminderSet ? (
                        <CheckCircle2 size={13} color="#FFFFFF" />
                      ) : (
                        <Bell size={13} color={OP_SURFACE.interest} />
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}

            {interestSignals.length > visibleInterests.length ? (
              <TouchableOpacity
                activeOpacity={0.72}
                onPress={() => {
                  const first = interestSignals[visibleInterests.length];
                  if (!first) return;
                  haptic();
                  onViewInterests(first);
                }}
                style={styles.moreRow}
              >
                <Text style={[styles.moreRowText, { color: OP_SURFACE.interest }]}>
                  +{interestSignals.length - visibleInterests.length} more update
                  {interestSignals.length - visibleInterests.length === 1 ? '' : 's'}
                </Text>
                <ChevronRight size={14} color={OP_SURFACE.interest} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyInterest}>
            <Sparkles size={16} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No time-sensitive interest updates right now.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.75}
        onPress={() => {
          haptic();
          onOpenTasks();
        }}
        style={[styles.progressCard, card]}
      >
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
              Your progress at a glance
            </Text>
          </View>
          <Text style={[styles.progressRate, { color: colors.text }]}>{habitProgress.rate}%</Text>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.text }]}>Habits</Text>
            <Text style={[styles.progressFraction, { color: colors.textSecondary }]}>
              {habitProgress.completed}/{habitProgress.total}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.surface : '#EDF1F5' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, habitProgress.rate))}%`,
                  backgroundColor: '#10B981',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.text }]}>Tasks due today</Text>
            <Text style={[styles.progressFraction, { color: colors.textSecondary }]}>
              {todayTaskStats.completed}/{todayTaskStats.total}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.surface : '#EDF1F5' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, todayTaskRate))}%`,
                  backgroundColor: '#7C3AED',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.progressFooter}>
          <Text style={[styles.progressFooterText, { color: colors.textSecondary }]}>
            {openHabitCount > 0
              ? `${openHabitCount} habit${openHabitCount === 1 ? '' : 's'} left today`
              : 'Habits complete for today'}
          </Text>
          <ChevronRight size={15} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.75}
        onPress={() => {
          haptic();
          onOpenInsights();
        }}
        style={[styles.insightCard, card]}
      >
        <View
          style={[
            styles.insightIcon,
            { backgroundColor: patternInsight ? 'rgba(245,158,11,0.10)' : 'rgba(37,99,235,0.09)' },
          ]}
        >
          {patternInsight ? (
            <Lightbulb size={17} color={OP_SURFACE.warning} strokeWidth={2.2} />
          ) : (
            <Sparkles size={17} color={OP_SURFACE.primary} strokeWidth={2.2} />
          )}
        </View>
        <View style={styles.insightCopy}>
          <Text
            style={[
              styles.kicker,
              { color: patternInsight ? OP_SURFACE.warning : OP_SURFACE.primary },
            ]}
          >
            {patternInsight ? 'ONE PAGER NOTICED' : 'LEARNING YOUR RHYTHM'}
          </Text>
          <Text style={[styles.insightText, { color: colors.text }]}>
            {patternInsight ?? learningCopy}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: OP_SPACING.xxxl,
    gap: 10,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  snapshotTile: {
    flex: 1,
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 10,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.025,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  snapshotIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  snapshotValue: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  snapshotLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  focusCard: {
    borderWidth: 1,
    borderRadius: OP_RADIUS.card,
    padding: 15,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  kickerIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    ...OP_TYPE.kicker,
  },
  focusTitle: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.55,
  },
  focusHabitCopy: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 7,
  },
  focusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  focusMetaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  metaDot: {
    fontSize: 12,
  },
  focusActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },
  startButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: OP_SURFACE.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  sectionSubtitle: {
    fontSize: 10.8,
    lineHeight: 14,
    marginTop: 2,
  },
  headerAction: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  headerActionText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  timeline: {
    marginTop: 2,
  },
  timelineRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
  },
  timelineTitle: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '700',
  },
  timelineMeta: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
  timelineTime: {
    maxWidth: 92,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyAction: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  interestList: {
    marginTop: 1,
  },
  interestRowWrap: {
    position: 'relative',
  },
  interestRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingRight: 2,
  },
  interestIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestCopy: {
    flex: 1,
    minWidth: 0,
  },
  interestTitle: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '700',
  },
  interestMeta: {
    fontSize: 10.8,
    lineHeight: 14,
    marginTop: 2,
  },
  inlineReminder: {
    position: 'absolute',
    right: 23,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  moreRowText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  emptyInterest: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  progressRate: {
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  progressBlock: {
    marginBottom: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
  },
  progressFraction: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  progressFooterText: {
    fontSize: 10.8,
    lineHeight: 14,
    fontWeight: '600',
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.025,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  insightCopy: {
    flex: 1,
    minWidth: 0,
  },
  insightText: {
    fontSize: 12.3,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 2,
  },
});
