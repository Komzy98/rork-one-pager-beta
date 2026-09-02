import React, { useMemo } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  ListChecks,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react-native';

import type { Task, TaskCompletion } from '@/types/task';
import type { ThemeColors } from '@/types/theme';
import type {
  TodayDoneScope,
  TodayPlanItem,
  TodaySourceFilter,
  TodayStatusFilter,
} from '@/utils/todayPlanSchedule';
import TodayPlanItemRow from './TodayPlanItemRow';
import HabitFormationCoach from '@/components/HabitFormationCoach';
import HabitCompletionToast from '@/components/HabitCompletionToast';
import TodayCompletionLog from '@/components/TodayCompletionLog';
import type { CompletionFeedback } from '@/hooks/useTodayHabits';
import type { TodayLogItem } from '@/utils/todayHabits';

export type QuickAddMode = 'task' | 'habit';

export interface TimeBlockViewModel {
  id: string;
  label: string;
  subtitle: string;
  status: 'Done' | 'Current' | 'Upcoming';
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

export interface TasksDashboardViewProps {
  colors: ThemeColors;
  isDark: boolean;
  paddingTop: number;
  paddingBottom: number;
  refreshing: boolean;
  onRefresh: () => void;
  momentumPercent: number;
  momentumTasksDone: number;
  momentumTasksTotal: number;
  momentumHabitsDone: number;
  momentumHabitsTotal: number;
  streakCount: number;
  peakPillText: string;
  aiSuggestion: string;
  aiSuggestionBold: string;
  focusTask: Task | null;
  focusHabit: Task | null;
  incompleteHabitsCount: number;
  onCompleteFocusHabit: () => void;
  onEditFocusHabit: () => void;
  isFocusActive: boolean;
  focusElapsed: string;
  inPeak: boolean;
  quickTaskTitle: string;
  onQuickTaskTitleChange: (text: string) => void;
  quickAddMode: QuickAddMode;
  onQuickAddModeChange: (mode: QuickAddMode) => void;
  onQuickAdd: () => void;
  onStartFocus: () => void;
  onPauseFocus: () => void;
  onCompleteFocus: () => void;
  onEditFocus: () => void;
  todaySourceFilter: TodaySourceFilter;
  onTodaySourceFilterChange: (filter: TodaySourceFilter) => void;
  todayStatusFilter: TodayStatusFilter;
  onTodayStatusFilterChange: (filter: TodayStatusFilter) => void;
  todayDoneScope: TodayDoneScope;
  onTodayDoneScopeChange: (scope: TodayDoneScope) => void;
  allOpenCount: number;
  allDoneCount: number;
  allWeekDoneCount: number;
  tasksOpenCount: number;
  tasksDoneCount: number;
  tasksWeekDoneCount: number;
  habitsOpenCount: number;
  habitsDoneCount: number;
  habitsWeekDoneCount: number;
  reduceMotion: boolean;
  onViewCompletionHistory: () => void;
  todayPlanItems: TodayPlanItem[];
  focusedTaskId: string | null;
  onTaskPress: (task: Task) => void;
  onTaskComplete: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  onSetInProgress: (task: Task) => void;
  onSetTaskFocus: (taskId: string) => void;
  getTaskColor: (task: Task) => string;
  getTaskMeta: (task: Task) => string;
  onToggleHabit: (habit: Task) => void;
  timeBlocks: TimeBlockViewModel[];
  pulseAnim: Animated.Value;
  hasContent: boolean;
  onCreateTask: () => void;
  onSeeAllTasks: () => void;
  onViewAllHabits: () => void;
  onAISuggestionPress: () => void;
  aiActionable: boolean;
  onOpenPeakScheduler: () => void;
  onOpenHabitCoach: () => void;
  showHabitCoach: boolean;
  calendarPlanner?: React.ReactNode;
  completionFeedback?: CompletionFeedback;
  onDismissCompletionFeedback?: () => void;
  onHabitMood?: (habitId: string, mood: NonNullable<TaskCompletion['mood']>) => void;
  todayLog?: TodayLogItem[];
  weeklyProgressByHabitId?: Record<string, string | undefined>;
  habitTimeById?: Record<string, string | undefined>;
}

const ACCENT = {
  blue: '#4F73E8',
  navy: '#14223B',
  green: '#18A86B',
  orange: '#E39120',
  purple: '#7458DF',
  red: '#D94B55',
};

function formatDateLabel() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function plural(value: number, singular: string, pluralValue = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  colors,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onAction} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{action}</Text>
          <ChevronRight size={15} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Metric({ value, label, accent, textColor }: { value: string; label: string; accent: string; textColor: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricDot, { backgroundColor: accent }]} />
      <Text style={[styles.metricValue, { color: textColor }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
  isDark,
  textColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[
        styles.filterChip,
        { backgroundColor: isDark ? '#171B22' : '#F1F3F6' },
        selected && styles.filterChipSelected,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.filterChipText, { color: selected ? '#FFFFFF' : textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TasksDashboardView(props: TasksDashboardViewProps) {
  const {
    colors,
    isDark,
    paddingTop,
    paddingBottom,
    refreshing,
    onRefresh,
    momentumPercent,
    momentumTasksDone,
    momentumTasksTotal,
    momentumHabitsDone,
    momentumHabitsTotal,
    streakCount,
    peakPillText,
    aiSuggestion,
    aiSuggestionBold,
    focusTask,
    focusHabit,
    incompleteHabitsCount,
    onCompleteFocusHabit,
    onEditFocusHabit,
    isFocusActive,
    focusElapsed,
    inPeak,
    quickTaskTitle,
    onQuickTaskTitleChange,
    quickAddMode,
    onQuickAddModeChange,
    onQuickAdd,
    onStartFocus,
    onPauseFocus,
    onCompleteFocus,
    onEditFocus,
    todaySourceFilter,
    onTodaySourceFilterChange,
    todayStatusFilter,
    onTodayStatusFilterChange,
    todayDoneScope,
    onTodayDoneScopeChange,
    allOpenCount,
    allDoneCount,
    allWeekDoneCount,
    tasksOpenCount,
    tasksDoneCount,
    tasksWeekDoneCount,
    habitsOpenCount,
    habitsDoneCount,
    habitsWeekDoneCount,
    onViewCompletionHistory,
    todayPlanItems,
    focusedTaskId,
    onTaskPress,
    onTaskComplete,
    onTaskDelete,
    onSetInProgress,
    onSetTaskFocus,
    getTaskColor,
    getTaskMeta,
    onToggleHabit,
    timeBlocks,
    pulseAnim,
    hasContent,
    onCreateTask,
    onSeeAllTasks,
    onViewAllHabits,
    onAISuggestionPress,
    aiActionable,
    onOpenPeakScheduler,
    onOpenHabitCoach,
    showHabitCoach,
    calendarPlanner,
    completionFeedback,
    onDismissCompletionFeedback,
    onHabitMood,
    todayLog = [],
    weeklyProgressByHabitId = {},
    habitTimeById = {},
  } = props;

  const surface = isDark ? '#15181F' : '#FFFFFF';
  const softSurface = isDark ? '#191D25' : '#F5F6F8';
  const border = isDark ? '#292E38' : '#E8EBF0';
  const muted = colors.textSecondary;

  const doneCount = momentumTasksDone + momentumHabitsDone;
  const totalCount = momentumTasksTotal + momentumHabitsTotal;
  const pendingCount = Math.max(0, totalCount - doneCount);
  const dateLabel = useMemo(formatDateLabel, []);

  const contextLine = useMemo(() => {
    if (!hasContent) return 'Build a simple system for what matters to you.';
    if (pendingCount === 0) return 'You’re clear for today. Protect the space you’ve created.';
    if (isFocusActive && focusTask) return `You’re in focus mode on ${focusTask.title}.`;
    if (focusTask) return `${plural(pendingCount, 'thing')} left today. Start with what matters most.`;
    if (incompleteHabitsCount > 0) return `${plural(incompleteHabitsCount, 'routine')} left to close out today.`;
    return 'Keep the day simple and intentional.';
  }, [focusTask, hasContent, incompleteHabitsCount, isFocusActive, pendingCount]);

  const openCount = todaySourceFilter === 'all'
    ? allOpenCount
    : todaySourceFilter === 'tasks'
      ? tasksOpenCount
      : habitsOpenCount;

  const doneCountForFilter = todayStatusFilter === 'done' && todayDoneScope === 'week'
    ? todaySourceFilter === 'all'
      ? allWeekDoneCount
      : todaySourceFilter === 'tasks'
        ? tasksWeekDoneCount
        : habitsWeekDoneCount
    : todaySourceFilter === 'all'
      ? allDoneCount
      : todaySourceFilter === 'tasks'
        ? tasksDoneCount
        : habitsDoneCount;

  const focusAccent = focusTask?.priority === 'urgent'
    ? ACCENT.red
    : focusTask?.priority === 'high'
      ? ACCENT.orange
      : ACCENT.blue;

  const currentBlock = timeBlocks.find((block) => block.status === 'Current') ?? null;
  const nextBlock = timeBlocks.find((block) => block.status === 'Upcoming') ?? null;

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { backgroundColor: surface, borderColor: border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1C2A27' : '#EAF8F2' }]}>
        <ListChecks size={27} color={ACCENT.green} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Your life, organised your way.</Text>
      <Text style={[styles.emptyCopy, { color: muted }]}>Start with one task or one routine. My Life will organise the rest around your day.</Text>
      <TouchableOpacity activeOpacity={0.82} onPress={onCreateTask} style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
        <Plus size={17} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add your first task</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop, paddingBottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={[styles.dateLabel, { color: muted }]}>{dateLabel.toUpperCase()}</Text>
            <Text style={[styles.pageTitle, { color: colors.text }]}>My Life</Text>
            <Text style={[styles.pageSubtitle, { color: muted }]}>{contextLine}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onCreateTask}
            style={[styles.addTopButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Add a task"
          >
            <Plus size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!hasContent ? renderEmptyState() : (
          <>
            <View style={[styles.daySnapshot, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.snapshotTop}>
                <View>
                  <Text style={[styles.snapshotKicker, { color: muted }]}>TODAY</Text>
                  <View style={styles.snapshotProgressRow}>
                    <Text style={[styles.snapshotPercent, { color: colors.text }]}>{momentumPercent}%</Text>
                    <Text style={[styles.snapshotProgressLabel, { color: muted }]}>complete</Text>
                  </View>
                </View>
                <View style={[styles.rhythmPill, { backgroundColor: softSurface }]}>
                  <TrendingUp size={14} color={ACCENT.green} />
                  <Text style={[styles.rhythmText, { color: colors.text }]} numberOfLines={1}>{peakPillText}</Text>
                </View>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#282D36' : '#ECEFF3' }]}>
                <View style={[styles.progressFill, { width: `${Math.max(3, momentumPercent)}%`, backgroundColor: momentumPercent >= 100 ? ACCENT.green : colors.primary }]} />
              </View>

              <View style={styles.metricsRow}>
                <Metric value={String(doneCount)} label="done" accent={ACCENT.green} textColor={colors.text} />
                <View style={[styles.metricDivider, { backgroundColor: border }]} />
                <Metric value={String(pendingCount)} label="left" accent={ACCENT.blue} textColor={colors.text} />
                <View style={[styles.metricDivider, { backgroundColor: border }]} />
                <Metric value={String(streakCount)} label="day streak" accent={ACCENT.orange} textColor={colors.text} />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title="Up next"
                subtitle={focusTask ? 'The strongest next move from today’s plan.' : focusHabit ? 'Tasks are clear. Protect your routine.' : 'Nothing is demanding your attention right now.'}
                colors={colors}
              />

              {focusTask ? (
                <Animated.View
                  style={[
                    styles.focusCard,
                    { backgroundColor: ACCENT.navy },
                    isFocusActive ? { transform: [{ scale: pulseAnim }] } : null,
                  ]}
                >
                  <View style={styles.focusHeader}>
                    <View style={styles.focusLabelRow}>
                      <View style={[styles.focusAccentDot, { backgroundColor: focusAccent }]} />
                      <Text style={styles.focusKicker}>{inPeak ? 'PEAK WINDOW' : 'NEXT PRIORITY'}</Text>
                    </View>
                    <TouchableOpacity onPress={onEditFocus} hitSlop={12}>
                      <MoreHorizontal size={22} color="#C9D3E5" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.focusTitle} numberOfLines={3}>{focusTask.title}</Text>
                  <View style={styles.focusMetaRow}>
                    <Clock3 size={14} color="#C9D3E5" />
                    <Text style={styles.focusMeta}>{focusTask.estimatedDuration ? `${focusTask.estimatedDuration} min` : 'Flexible time'}</Text>
                    <View style={styles.focusMetaDot} />
                    <Text style={styles.focusMeta}>{focusTask.priority === 'urgent' ? 'Urgent' : focusTask.priority === 'high' ? 'High priority' : 'Planned'}</Text>
                  </View>

                  <View style={styles.focusActions}>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={isFocusActive ? onPauseFocus : onStartFocus}
                      style={styles.focusPrimary}
                    >
                      {isFocusActive ? <Pause size={17} color={ACCENT.navy} fill={ACCENT.navy} /> : <Play size={17} color={ACCENT.navy} fill={ACCENT.navy} />}
                      <Text style={styles.focusPrimaryText}>{isFocusActive ? `Pause · ${focusElapsed}` : 'Start focus'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} onPress={onCompleteFocus} style={styles.focusDone}>
                      <Check size={17} color="#FFFFFF" />
                      <Text style={styles.focusDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ) : focusHabit ? (
                <View style={[styles.routineFocusCard, { backgroundColor: isDark ? '#14251F' : '#EDF8F3', borderColor: isDark ? '#23543E' : '#D4EEE2' }]}>
                  <View style={[styles.routineFocusIcon, { backgroundColor: isDark ? '#1C382E' : '#DDF4E9' }]}>
                    <Target size={22} color={ACCENT.green} />
                  </View>
                  <View style={styles.routineFocusCopy}>
                    <Text style={[styles.routineFocusKicker, { color: ACCENT.green }]}>ROUTINE TO CLOSE OUT</Text>
                    <Text style={[styles.routineFocusTitle, { color: colors.text }]} numberOfLines={2}>{focusHabit.title}</Text>
                    <Text style={[styles.routineFocusMeta, { color: muted }]}>{focusHabit.habitStreak ? `${focusHabit.habitStreak}-day streak` : 'Build some momentum today'}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.8} onPress={onCompleteFocusHabit} style={styles.routineCheck}>
                    <Check size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onEditFocusHabit} hitSlop={10} style={styles.routineMore}>
                    <MoreHorizontal size={18} color={muted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.allClearCard, { backgroundColor: softSurface }]}>
                  <View style={[styles.allClearIcon, { backgroundColor: isDark ? '#20382F' : '#E1F5EB' }]}><CheckCircle2 size={22} color={ACCENT.green} /></View>
                  <View style={styles.allClearCopy}>
                    <Text style={[styles.allClearTitle, { color: colors.text }]}>All clear for now</Text>
                    <Text style={[styles.allClearText, { color: muted }]}>You don’t need another productivity card. Enjoy the space.</Text>
                  </View>
                </View>
              )}
            </View>

            {(aiSuggestion || aiSuggestionBold) ? (
              <TouchableOpacity
                activeOpacity={aiActionable ? 0.82 : 1}
                onPress={aiActionable ? onAISuggestionPress : undefined}
                style={[styles.suggestionCard, { backgroundColor: isDark ? '#171E2B' : '#F0F4FF', borderColor: isDark ? '#26334A' : '#DEE7FF' }]}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: isDark ? '#222D43' : '#DFE8FF' }]}>
                  <Sparkles size={17} color={colors.primary} />
                </View>
                <View style={styles.suggestionCopy}>
                  <Text style={[styles.suggestionKicker, { color: colors.primary }]}>ONE PAGER SUGGESTS</Text>
                  <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={3}>
                    {aiSuggestion}{aiSuggestionBold ? ` ${aiSuggestionBold}` : ''}
                  </Text>
                </View>
                {aiActionable ? <ChevronRight size={18} color={colors.primary} /> : null}
              </TouchableOpacity>
            ) : null}

            <View style={[styles.captureCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.captureTop}>
                <Text style={[styles.captureLabel, { color: colors.text }]}>Quick capture</Text>
                <View style={[styles.captureMode, { backgroundColor: softSurface }]}>
                  {(['task', 'habit'] as QuickAddMode[]).map((mode) => {
                    const selected = quickAddMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        activeOpacity={0.78}
                        onPress={() => onQuickAddModeChange(mode)}
                        style={[styles.captureModeButton, selected && { backgroundColor: isDark ? '#2A303A' : '#FFFFFF' }]}
                      >
                        <Text style={[styles.captureModeText, { color: selected ? colors.text : muted }]}>{mode === 'task' ? 'Task' : 'Routine'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={[styles.captureInputRow, { backgroundColor: softSurface }]}>
                <TextInput
                  value={quickTaskTitle}
                  onChangeText={onQuickTaskTitleChange}
                  onSubmitEditing={onQuickAdd}
                  placeholder={quickAddMode === 'habit' ? 'Add a routine…' : 'Add something you need to do…'}
                  placeholderTextColor={muted}
                  returnKeyType="done"
                  style={[styles.captureInput, { color: colors.text }]}
                />
                <TouchableOpacity
                  activeOpacity={0.82}
                  disabled={!quickTaskTitle.trim()}
                  onPress={onQuickAdd}
                  style={[styles.captureAdd, { backgroundColor: colors.primary, opacity: quickTaskTitle.trim() ? 1 : 0.4 }]}
                >
                  <Plus size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title="Today"
                subtitle={`${plural(openCount, 'open item')} · ${doneCountForFilter} done`}
                action="See all"
                onAction={onSeeAllTasks}
                colors={colors}
              />

              {todayLog.length > 0 ? <TodayCompletionLog items={todayLog} /> : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
                <FilterChip label={`All ${todaySourceFilter === 'all' ? `· ${todayStatusFilter === 'open' ? allOpenCount : todayDoneScope === 'week' ? allWeekDoneCount : allDoneCount}` : ''}`} selected={todaySourceFilter === 'all'} onPress={() => onTodaySourceFilterChange('all')} isDark={isDark} textColor={muted} />
                <FilterChip label={`Tasks ${todaySourceFilter === 'tasks' ? `· ${todayStatusFilter === 'open' ? tasksOpenCount : todayDoneScope === 'week' ? tasksWeekDoneCount : tasksDoneCount}` : ''}`} selected={todaySourceFilter === 'tasks'} onPress={() => onTodaySourceFilterChange('tasks')} isDark={isDark} textColor={muted} />
                <FilterChip label={`Routines ${todaySourceFilter === 'habits' ? `· ${todayStatusFilter === 'open' ? habitsOpenCount : todayDoneScope === 'week' ? habitsWeekDoneCount : habitsDoneCount}` : ''}`} selected={todaySourceFilter === 'habits'} onPress={() => onTodaySourceFilterChange('habits')} isDark={isDark} textColor={muted} />
              </ScrollView>

              <View style={styles.statusRow}>
                <View style={[styles.statusToggle, { backgroundColor: softSurface }]}>
                  <TouchableOpacity onPress={() => onTodayStatusFilterChange('open')} style={[styles.statusButton, todayStatusFilter === 'open' && { backgroundColor: surface }]}>
                    <Text style={[styles.statusButtonText, { color: todayStatusFilter === 'open' ? colors.text : muted }]}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onTodayStatusFilterChange('done')} style={[styles.statusButton, todayStatusFilter === 'done' && { backgroundColor: surface }]}>
                    <Text style={[styles.statusButtonText, { color: todayStatusFilter === 'done' ? colors.text : muted }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                {todayStatusFilter === 'done' ? (
                  <View style={styles.doneControls}>
                    <TouchableOpacity onPress={() => onTodayDoneScopeChange(todayDoneScope === 'today' ? 'week' : 'today')}>
                      <Text style={[styles.scopeLink, { color: colors.primary }]}>{todayDoneScope === 'today' ? 'Today' : 'This week'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onViewCompletionHistory}>
                      <Text style={[styles.historyLink, { color: muted }]}>History</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <View style={[styles.planCard, { backgroundColor: surface, borderColor: border }]}>
                {todayPlanItems.length === 0 ? (
                  <View style={styles.planEmpty}>
                    <CheckCircle2 size={22} color={todayStatusFilter === 'open' ? ACCENT.green : muted} />
                    <Text style={[styles.planEmptyTitle, { color: colors.text }]}>{todayStatusFilter === 'open' ? 'Nothing else needs your attention' : 'Nothing completed in this view yet'}</Text>
                    <Text style={[styles.planEmptyCopy, { color: muted }]}>{todayStatusFilter === 'open' ? 'A quiet list is a feature, not a problem.' : 'Completed items will appear here.'}</Text>
                  </View>
                ) : (
                  todayPlanItems.map((item, index) => (
                    <TodayPlanItemRow
                      key={item.id}
                      item={item}
                      textColor={colors.text}
                      mutedColor={muted}
                      borderColor={border}
                      isDark={isDark}
                      isFocusRow={
                        item.kind === 'task'
                          ? item.task.id === focusedTaskId || item.task.id === focusTask?.id
                          : item.task.id === focusHabit?.id
                      }
                      getTaskColor={getTaskColor}
                      getTaskMeta={getTaskMeta}
                      onTaskPress={onTaskPress}
                      onTaskComplete={onTaskComplete}
                      onTaskDelete={onTaskDelete}
                      onSetInProgress={onSetInProgress}
                      onSetFocus={onSetTaskFocus}
                      onToggleHabit={onToggleHabit}
                      weeklyProgressLabel={item.kind === 'habit' ? weeklyProgressByHabitId[item.task.id] : undefined}
                      recommendedTimeLabel={item.kind === 'habit' ? habitTimeById[item.task.id] : undefined}
                      isLast={index === todayPlanItems.length - 1}
                    />
                  ))
                )}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title="Routines"
                subtitle={momentumHabitsTotal > 0 ? `${momentumHabitsDone} of ${momentumHabitsTotal} complete today` : 'Build repeatable systems, not another checklist.'}
                action="View all"
                onAction={onViewAllHabits}
                colors={colors}
              />

              <View style={[styles.routinesCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={styles.routinesTop}>
                  <View style={[styles.routinesIcon, { backgroundColor: isDark ? '#183329' : '#EAF8F2' }]}>
                    <Flame size={21} color={ACCENT.green} />
                  </View>
                  <View style={styles.routinesCopy}>
                    <Text style={[styles.routinesTitle, { color: colors.text }]}>{momentumHabitsTotal > 0 ? `${plural(incompleteHabitsCount, 'routine')} remaining` : 'No routines yet'}</Text>
                    <Text style={[styles.routinesMeta, { color: muted }]}>{streakCount > 0 ? `${streakCount}-day consistency streak` : 'Consistency will matter more than intensity.'}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.8} onPress={onViewAllHabits} style={[styles.routinesArrow, { backgroundColor: softSurface }]}>
                    <ArrowRight size={17} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.routineProgressTrack, { backgroundColor: isDark ? '#282D36' : '#ECEFF3' }]}>
                  <View style={[styles.routineProgressFill, { width: `${momentumHabitsTotal > 0 ? Math.round((momentumHabitsDone / momentumHabitsTotal) * 100) : 0}%` }]} />
                </View>
                <View style={styles.routineActions}>
                  <TouchableOpacity activeOpacity={0.78} onPress={onOpenHabitCoach} style={[styles.secondaryAction, { backgroundColor: softSurface }]}>
                    <Sparkles size={15} color={ACCENT.green} />
                    <Text style={[styles.secondaryActionText, { color: colors.text }]}>Habit coach</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.78} onPress={onOpenPeakScheduler} style={[styles.secondaryAction, { backgroundColor: softSurface }]}>
                    <Zap size={15} color={colors.primary} />
                    <Text style={[styles.secondaryActionText, { color: colors.text }]}>Schedule around energy</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showHabitCoach ? (
                <View style={styles.coachWrap}>
                  <HabitFormationCoach maxItems={3} />
                </View>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title="Shape of your day"
                subtitle={currentBlock ? `You’re in your ${currentBlock.label.toLowerCase()} block.` : nextBlock ? `${nextBlock.label} is the next block.` : 'A simple view of how today is unfolding.'}
                colors={colors}
              />
              <View style={[styles.dayShapeCard, { backgroundColor: surface, borderColor: border }]}>
                {timeBlocks.map((block, index) => {
                  const Icon = block.icon;
                  const isCurrent = block.status === 'Current';
                  const isDone = block.status === 'Done';
                  return (
                    <View key={block.id} style={[styles.dayShapeRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}>
                      <View style={[styles.dayShapeIcon, { backgroundColor: isCurrent ? (isDark ? '#1E2B47' : '#EDF3FF') : softSurface }]}>
                        <Icon size={18} color={isCurrent ? colors.primary : isDone ? ACCENT.green : muted} />
                      </View>
                      <View style={styles.dayShapeCopy}>
                        <View style={styles.dayShapeTitleRow}>
                          <Text style={[styles.dayShapeTitle, { color: colors.text }]}>{block.label}</Text>
                          <Text style={[styles.dayShapeStatus, { color: isCurrent ? colors.primary : isDone ? ACCENT.green : muted }]}>{block.status}</Text>
                        </View>
                        <Text style={[styles.dayShapeSubtitle, { color: muted }]} numberOfLines={2}>{block.subtitle}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {calendarPlanner ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Calendar & rhythm" subtitle="Fit routines into real space instead of forcing them into your day." colors={colors} />
                {calendarPlanner}
              </View>
            ) : null}

            <View style={[styles.bottomUtility, { borderTopColor: border }]}>
              <CalendarDays size={16} color={muted} />
              <Text style={[styles.bottomUtilityText, { color: muted }]}>My Life should help you run the day — not make you manage another dashboard.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {completionFeedback ? (
        <HabitCompletionToast
          feedback={completionFeedback}
          onDismiss={onDismissCompletionFeedback}
          onMood={onHabitMood}
          bottomInset={paddingBottom - 12}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
    marginBottom: 24,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  dateLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  pageTitle: {
    marginTop: 5,
    fontSize: 36,
    lineHeight: 41,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  pageSubtitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    maxWidth: 330,
  },
  addTopButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  daySnapshot: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  snapshotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  snapshotKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  snapshotProgressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  snapshotPercent: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  snapshotProgressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rhythmPill: {
    maxWidth: 165,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rhythmText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
  },
  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#8C94A1',
    fontSize: 11,
    fontWeight: '600',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
  },
  sectionBlock: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 2,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  focusCard: {
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0B1528',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  focusAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  focusKicker: {
    color: '#C9D3E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.25,
  },
  focusTitle: {
    color: '#FFFFFF',
    marginTop: 14,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.55,
  },
  focusMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 11,
  },
  focusMeta: {
    color: '#C9D3E5',
    fontSize: 12,
    fontWeight: '600',
  },
  focusMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#65738B',
  },
  focusActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  focusPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  focusPrimaryText: {
    color: ACCENT.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  focusDone: {
    minWidth: 92,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  focusDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  routineFocusCard: {
    minHeight: 96,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routineFocusIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineFocusCopy: {
    flex: 1,
    minWidth: 0,
  },
  routineFocusKicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.05,
  },
  routineFocusTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
  },
  routineFocusMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  routineCheck: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineMore: {
    width: 24,
    alignItems: 'flex-end',
  },
  allClearCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allClearIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allClearCopy: {
    flex: 1,
  },
  allClearTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  allClearText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  suggestionCard: {
    marginTop: 16,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  suggestionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionCopy: {
    flex: 1,
    minWidth: 0,
  },
  suggestionKicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.05,
  },
  suggestionText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  captureCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
  },
  captureTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  captureLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  captureMode: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
  },
  captureModeButton: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  captureInputRow: {
    minHeight: 48,
    borderRadius: 14,
    paddingLeft: 13,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  captureInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '500',
  },
  captureAdd: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRail: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    minHeight: 35,
    borderRadius: 18,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: {
    backgroundColor: ACCENT.navy,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  statusToggle: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 2,
  },
  statusButton: {
    minHeight: 31,
    minWidth: 60,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  doneControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  scopeLink: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyLink: {
    fontSize: 11,
    fontWeight: '700',
  },
  planCard: {
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  planEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  planEmptyTitle: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  planEmptyCopy: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  routinesCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
  },
  routinesTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  routinesIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routinesCopy: {
    flex: 1,
    minWidth: 0,
  },
  routinesTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  routinesMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  routinesArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 15,
  },
  routineProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ACCENT.green,
  },
  routineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 13,
  },
  secondaryAction: {
    minHeight: 36,
    borderRadius: 12,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  secondaryActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  coachWrap: {
    marginTop: 12,
  },
  dayShapeCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  dayShapeRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
  },
  dayShapeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayShapeCopy: {
    flex: 1,
    minWidth: 0,
  },
  dayShapeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dayShapeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dayShapeStatus: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayShapeSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  bottomUtility: {
    marginTop: 30,
    paddingTop: 17,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bottomUtilityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 300,
  },
  emptyButton: {
    marginTop: 17,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
