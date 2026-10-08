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
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenInterest: (signal: OverviewInterestSignal) => void;
  onViewInterests: (signal: OverviewInterestSignal) => void;
  onRemindInterest?: (signal: OverviewInterestSignal) => Promise<boolean>;
  onOpenInsights: () => void;
}

type TimelineItem =
  | { id: string; kind: 'task'; title: string; timeLabel: string; sortTime: number; task: Task }
  | { id: string; kind: 'habit'; title: string; timeLabel: string; sortTime: number; task: Task }
  | { id: string; kind: 'calendar'; title: string; timeLabel: string; sortTime: number; calendar: OverviewCalendarItem };

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

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Today';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDueLabel(task: Task): string {
  if (!task.dueDate) return 'Today';
  const date = new Date(task.dueDate);
  if (!Number.isFinite(date.getTime())) return 'Today';
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

  return candidates[0]?.task ?? null;
}

function buildTimeline(
  tasks: readonly Task[],
  calendarItems: readonly OverviewCalendarItem[],
  todayYmd: string,
  focusTaskId?: string,
): TimelineItem[] {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const taskItems: TimelineItem[] = tasks
    .filter(
      (task) =>
        !task.isHabit &&
        task.id !== focusTaskId &&
        task.status !== 'completed' &&
        task.status !== 'cancelled' &&
        Boolean(task.dueDate) &&
        ymd(new Date(task.dueDate!)) === todayYmd,
    )
    .map((task) => {
      const due = new Date(task.dueDate!);
      const hasTime =
        due.getHours() !== 0 || due.getMinutes() !== 0 || due.getSeconds() !== 0;
      return {
        id: `task:${task.id}`,
        kind: 'task' as const,
        title: task.title,
        timeLabel: hasTime ? formatClock(task.dueDate!) : 'Today',
        sortTime: hasTime ? due.getTime() : end.getTime() - 2,
        task,
      };
    });

  const habitItems: TimelineItem[] = tasks
    .filter(
      (task) =>
        isHabitScheduledToday(task, now) &&
        !isHabitCompleteToday(task, todayYmd),
    )
    .slice(0, 2)
    .map((task, index) => ({
      id: `habit:${task.id}`,
      kind: 'habit' as const,
      title: task.title,
      timeLabel: task.habitEngine?.windowStart
        ? task.habitEngine.windowStart
        : 'Anytime',
      sortTime: task.habitEngine?.windowStart
        ? new Date(`${todayYmd}T${task.habitEngine.windowStart}:00`).getTime()
        : end.getTime() - 1 + index,
      task,
    }));

  const calendarTimeline: TimelineItem[] = calendarItems
    .filter((item) => {
      const start = new Date(item.startDate);
      return Number.isFinite(start.getTime()) && ymd(start) === todayYmd;
    })
    .map((item) => ({
      id: `calendar:${item.id}`,
      kind: 'calendar' as const,
      title: item.title,
      timeLabel: formatClock(item.startDate),
      sortTime: new Date(item.startDate).getTime(),
      calendar: item,
    }));

  return [...taskItems, ...habitItems, ...calendarTimeline]
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(0, 4);
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

export default function OverviewPersonalBriefing({
  tasks,
  todayYmd,
  calendarItems,
  interestSignals,
  patternInsight,
  habitProgress,
  onStartTask,
  onOpenTasks,
  onOpenCalendar,
  onOpenInterest,
  onViewInterests,
  onRemindInterest,
  onOpenInsights,
}: Props) {
  const { colors, isDark } = useTheme();
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  const focusTask = useMemo(() => pickFocusTask(tasks, todayYmd), [tasks, todayYmd]);
  const timeline = useMemo(
    () => buildTimeline(tasks, calendarItems, todayYmd, focusTask?.id),
    [tasks, calendarItems, todayYmd, focusTask?.id],
  );
  const interest = interestSignals[0] ?? null;
  const sameCategoryMoreCount = interest
    ? Math.max(0, interestSignals.filter((signal) => signal.category === interest.category).length - 1)
    : 0;

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

  const haptic = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };

  const setInterestReminder = async () => {
    if (!interest || !onRemindInterest || reminderBusy || reminderSet) return;
    haptic();
    setReminderBusy(true);
    try {
      const success = await onRemindInterest(interest);
      if (success) setReminderSet(true);
    } finally {
      setReminderBusy(false);
    }
  };

  const card = {
    backgroundColor: isDark ? colors.surfaceSecondary : '#FFFFFF',
    borderColor: isDark ? colors.border : 'rgba(15,23,42,0.08)',
  };

  return (
    <View style={styles.root}>
      {focusTask ? (
        <View style={[styles.focusCard, card]}>
          <View style={styles.sectionKickerRow}>
            <View style={[styles.kickerIcon, { backgroundColor: 'rgba(37,99,235,0.10)' }]}>
              <Sparkles size={14} color="#2563EB" strokeWidth={2.3} />
            </View>
            <Text style={[styles.kicker, { color: '#2563EB' }]}>MOST IMPORTANT</Text>
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
                  : focusTask.category}
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
                { backgroundColor: isDark ? colors.surface : '#F3F5F8' },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>View task</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={[styles.card, card]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Up next</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
              Tasks, habits and calendar in one place
            </Text>
          </View>
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
                  ? '#2563EB'
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
                      borderTopColor: isDark ? colors.border : 'rgba(15,23,42,0.08)',
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
                  <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
                    {item.timeLabel}
                  </Text>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nothing else is scheduled for today.
          </Text>
        )}
      </View>

      {interest ? (
        <View style={[styles.interestCard, card]}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={() => {
              haptic();
              onOpenInterest(interest);
            }}
            style={styles.interestMain}
          >
            <View style={[styles.interestIcon, { backgroundColor: 'rgba(79,70,229,0.08)' }]}>
              <SignalIcon signal={interest} color="#4F46E5" />
            </View>
            <View style={styles.interestCopy}>
              <Text style={[styles.kicker, { color: colors.textTertiary }]}>FOR YOU</Text>
              <Text style={[styles.interestTitle, { color: colors.text }]} numberOfLines={1}>
                {interest.title}
              </Text>
              <Text style={[styles.interestMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {interest.subtitle}
              </Text>
            </View>
            <ChevronRight size={17} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.interestActions}>
            {interest.kind === 'football' && interest.football.kind === 'football_upcoming' && onRemindInterest ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={reminderBusy || reminderSet}
                activeOpacity={0.72}
                onPress={() => void setInterestReminder()}
                style={[
                  styles.remindButton,
                  {
                    backgroundColor: reminderSet
                      ? '#16A34A'
                      : isDark
                        ? 'rgba(99,102,241,0.16)'
                        : 'rgba(79,70,229,0.08)',
                  },
                ]}
              >
                {reminderBusy ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : reminderSet ? (
                  <>
                    <CheckCircle2 size={14} color="#FFFFFF" />
                    <Text style={styles.reminderSetText}>Reminder set</Text>
                  </>
                ) : (
                  <>
                    <Bell size={14} color="#4F46E5" />
                    <Text style={styles.remindText}>Remind me</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {sameCategoryMoreCount > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.72}
                onPress={() => {
                  haptic();
                  onViewInterests(interest);
                }}
                style={styles.moreInterestsButton}
              >
                <Text style={[styles.moreInterestsText, { color: colors.textSecondary }]}>
                  +{sameCategoryMoreCount} more
                </Text>
                <ChevronRight size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      {patternInsight ? (
        <View style={[styles.insightCard, card]}>
          <View style={[styles.insightIcon, { backgroundColor: 'rgba(245,158,11,0.10)' }]}>
            <Lightbulb size={17} color="#D97706" strokeWidth={2.2} />
          </View>
          <View style={styles.insightCopy}>
            <Text style={[styles.kicker, { color: '#D97706' }]}>PATTERN</Text>
            <Text style={[styles.insightText, { color: colors.text }]}>{patternInsight}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.72}
            onPress={() => {
              haptic();
              onOpenInsights();
            }}
            style={[
              styles.whyButton,
              { backgroundColor: isDark ? colors.surface : '#F3F5F8' },
            ]}
          >
            <Text style={[styles.whyText, { color: colors.text }]}>See why</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.75}
        onPress={() => {
          haptic();
          onOpenTasks();
        }}
        style={[styles.progressRow, card]}
      >
        <View style={styles.progressCopy}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Today</Text>
          <Text style={[styles.progressMeta, { color: colors.textSecondary }]}>
            {habitProgress.completed}/{habitProgress.total} habits
            {todayTaskStats.total > 0
              ? ` · ${todayTaskStats.completed}/${todayTaskStats.total} tasks`
              : ''}
          </Text>
        </View>
        <View style={styles.progressRight}>
          <Text style={[styles.progressRate, { color: colors.text }]}>
            {habitProgress.rate}%
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.035,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  focusCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.055,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  kickerIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.0,
  },
  focusTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  focusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 9,
  },
  focusMetaText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  metaDot: {
    fontSize: 12,
  },
  focusActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },
  startButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  timeline: {
    marginTop: 3,
  },
  timelineRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
  },
  timelineTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  timelineMeta: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
  interestCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.035,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  interestMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  interestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestCopy: {
    flex: 1,
    minWidth: 0,
  },
  interestTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  interestMeta: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  interestActions: {
    marginLeft: 51,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remindButton: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  remindText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
    color: '#4F46E5',
  },
  reminderSetText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreInterestsButton: {
    minHeight: 34,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreInterestsText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  insightCopy: {
    flex: 1,
    minWidth: 0,
  },
  insightText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 3,
  },
  whyButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
  },
  progressRow: {
    borderWidth: 1,
    borderRadius: 17,
    minHeight: 58,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  progressCopy: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  progressMeta: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  progressRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressRate: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
});
