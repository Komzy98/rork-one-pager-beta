import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {
  CheckCircle2,
  Clock3,
  Flame,
  Zap,
  Play,
  Pause,
  Plus,
  Sparkles,
  TrendingUp,
  MoreHorizontal,
  Target,
  Coffee,
  Sun,
  Sunset,
  Moon,
  ListChecks,
} from 'lucide-react-native';
import type { Task } from '@/types/task';
import type { ThemeColors } from '@/types/theme';
import type {
  TodayDoneScope,
  TodayPlanItem,
  TodaySourceFilter,
  TodayStatusFilter,
} from '@/utils/todayPlanSchedule';

const NARROW_HEADER_WIDTH = 380;
import TodayPlanItemRow from './TodayPlanItemRow';
import HabitFormationCoach from '@/components/HabitFormationCoach';
import HabitCompletionToast from '@/components/HabitCompletionToast';
import TodayCompletionLog from '@/components/TodayCompletionLog';
import type { CompletionFeedback } from '@/hooks/useTodayHabits';
import type { TodayLogItem } from '@/utils/todayHabits';

export type QuickAddMode = 'task' | 'habit';

const ACCENT = {
  green: '#18C383',
  blue: '#3578F6',
  navy: '#112C63',
  cyan: '#49C8F2',
  orange: '#F59E0B',
  purple: '#7B61FF',
};

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
  completionFeedback?: CompletionFeedback;
  onDismissCompletionFeedback?: () => void;
  todayLog?: TodayLogItem[];
  weeklyProgressByHabitId?: Record<string, string | undefined>;
}

function MiniStat({
  icon,
  value,
  label,
  mutedColor,
  textColor,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  mutedColor: string;
  textColor: string;
}) {
  return (
    <View style={styles.miniStat}>
      <View style={styles.statIconValue}>
        {icon}
        <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

function TimelineRow({
  icon: Icon,
  title,
  subtitle,
  status,
  done,
  current,
  cardBg,
  mutedColor,
  textColor,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle: string;
  status: string;
  done?: boolean;
  current?: boolean;
  cardBg: string;
  mutedColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.timelineRow, current && { backgroundColor: cardBg }]}>
      <View style={[styles.timelineIcon, current && styles.timelineIconCurrent]}>
        <Icon size={18} color={current ? ACCENT.blue : '#333842'} />
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.timelineTitleRow}>
          <Text style={[styles.timelineTitle, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          <Text
            style={[
              styles.timelineStatus,
              { color: mutedColor },
              done && { color: ACCENT.green },
              current && { color: ACCENT.blue },
            ]}
            numberOfLines={1}
          >
            {status}
          </Text>
        </View>
        <Text style={[styles.timelineSubtitle, { color: mutedColor }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function TasksDashboardView({
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
  reduceMotion,
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
  completionFeedback,
  onDismissCompletionFeedback,
  todayLog = [],
  weeklyProgressByHabitId = {},
}: TasksDashboardViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isNarrowHeader = windowWidth < NARROW_HEADER_WIDTH;
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#E7EAF0';
  const muted = colors.textSecondary;
  const timelineActiveBg = isDark ? 'rgba(53,120,246,0.15)' : '#EDF5FF';
  const ringRotation = reduceMotion ? 0 : -90 + (momentumPercent / 100) * 270;
  const doneCount = momentumTasksDone + momentumHabitsDone;
  const pendingCount = Math.max(
    0,
    momentumTasksTotal + momentumHabitsTotal - doneCount,
  );
  const doneCountForFilter =
    todayStatusFilter === 'done' && todayDoneScope === 'week'
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

  const renderMomentumBlock = (centered?: boolean) => (
    <View
      style={[styles.momentumWrap, centered && styles.momentumWrapCentered]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Momentum ${momentumPercent} percent. ${momentumTasksDone} of ${momentumTasksTotal} tasks and ${momentumHabitsDone} of ${momentumHabitsTotal} habits completed today.`}
    >
      <View
        style={[
          styles.ringOuter,
          {
            borderTopColor: ACCENT.green,
            borderRightColor: momentumPercent > 25 ? ACCENT.green : border,
            borderBottomColor: momentumPercent > 50 ? ACCENT.green : border,
            borderLeftColor: momentumPercent > 75 ? ACCENT.green : border,
            ...(reduceMotion ? null : { transform: [{ rotate: `${ringRotation}deg` }] }),
          },
        ]}
      >
        <View
          style={[
            styles.ringInner,
            reduceMotion ? null : { transform: [{ rotate: `${-ringRotation}deg` }] },
          ]}
        >
          <Zap size={16} color={ACCENT.green} fill={ACCENT.green} />
          <Text
            style={[styles.ringPercent, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {momentumPercent}%
          </Text>
          <Text style={[styles.ringLabel, { color: muted }]} numberOfLines={1}>
            MOMENTUM
          </Text>
        </View>
      </View>
      <Text style={[styles.momentumBreakdown, { color: muted }]} numberOfLines={2}>
        {momentumTasksDone}/{momentumTasksTotal} tasks · {momentumHabitsDone}/{momentumHabitsTotal}{' '}
        habits
      </Text>
      <Text style={[styles.momentumHint, { color: muted }]}>
        % of today&apos;s plan completed
      </Text>
      <View style={[styles.peakPill, { backgroundColor: surface }]}>
        <TrendingUp size={14} color={ACCENT.green} />
        <Text style={[styles.peakText, { color: muted }]}>{peakPillText}</Text>
      </View>
    </View>
  );

  const renderStats = () => {
    if (isNarrowHeader) {
      return (
        <Text style={[styles.compactStats, { color: muted }]} accessibilityRole="text">
          <Text style={{ color: colors.text, fontWeight: '800' }}>{doneCount}</Text> done ·{' '}
          <Text style={{ color: colors.text, fontWeight: '800' }}>{pendingCount}</Text> pending ·{' '}
          <Text style={{ color: colors.text, fontWeight: '800' }}>{streakCount}</Text> day streak
        </Text>
      );
    }

    return (
      <View style={styles.statsRow}>
        <MiniStat
          icon={<CheckCircle2 size={19} color={ACCENT.green} />}
          value={String(doneCount)}
          label="Done"
          mutedColor={muted}
          textColor={colors.text}
        />
        <View style={[styles.divider, { backgroundColor: border }]} />
        <MiniStat
          icon={<Clock3 size={19} color={ACCENT.blue} />}
          value={String(pendingCount)}
          label="Pending"
          mutedColor={muted}
          textColor={colors.text}
        />
        <View style={[styles.divider, { backgroundColor: border }]} />
        <MiniStat
          icon={<Flame size={19} color={ACCENT.orange} />}
          value={String(streakCount)}
          label="Day Streak"
          mutedColor={muted}
          textColor={colors.text}
        />
      </View>
    );
  };

  const renderZeroState = () => (
    <View style={styles.zeroState}>
      <View style={[styles.zeroIconWrap, { backgroundColor: ACCENT.green + '20' }]}>
        <ListChecks size={36} color={ACCENT.green} />
      </View>
      <Text style={[styles.zeroTitle, { color: colors.text }]}>No tasks yet</Text>
      <Text style={[styles.zeroSubtitle, { color: muted }]}>
        Add your first task below to start building momentum
      </Text>
      <TouchableOpacity style={styles.zeroButton} onPress={onCreateTask} activeOpacity={0.85}>
        <Plus size={18} color="#FFFFFF" />
        <Text style={styles.zeroButtonText}>Create Detailed Task</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingTop, paddingBottom }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={ACCENT.green}
          colors={[ACCENT.green]}
        />
      }
    >
      <View style={[styles.header, isNarrowHeader && styles.headerStacked]}>
        <View style={[styles.headerMain, isNarrowHeader && styles.headerMainStacked]}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Focus on what{'\n'}moves the needle.
          </Text>
          <Text style={[styles.subtitle, { color: muted }]}>
            Small steps today. Big results tomorrow.
          </Text>
          {!isNarrowHeader ? renderStats() : null}
        </View>

        {!isNarrowHeader ? renderMomentumBlock() : null}
      </View>

      {isNarrowHeader ? (
        <>
          {renderMomentumBlock(true)}
          {renderStats()}
        </>
      ) : null}

      {!hasContent ? (
        renderZeroState()
      ) : (
        <>
          {focusTask ? (
            <Animated.View
              style={[
                styles.focusCard,
                {
                  transform: [
                    {
                      scale:
                        isFocusActive && !reduceMotion ? pulseAnim : 1,
                    },
                  ],
                },
              ]}
            >
              <View style={styles.focusTopRow}>
                <View style={styles.focusPill}>
                  <Zap size={15} color="#FFFFFF" />
                  <Text style={styles.focusPillText}>
                    {inPeak ? 'PEAK FOCUS' : 'FOCUS SESSION'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onEditFocus}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFocusActive
                      ? `Focus timer ${focusElapsed}. Open task options`
                      : 'Open focus task options'
                  }
                >
                  {isFocusActive ? (
                    <View style={styles.timerChip}>
                      <Clock3 size={14} color="#DDE8FF" />
                      <Text style={styles.timerChipText}>{focusElapsed}</Text>
                    </View>
                  ) : (
                    <MoreHorizontal size={25} color="#DDE8FF" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.focusBody}>
                <View style={styles.focusTextBlock}>
                  <Text style={styles.focusTitle} numberOfLines={3}>
                    {focusTask.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Clock3 size={14} color="#EAF1FF" />
                    <Text style={styles.focusMeta}>
                      {focusTask.estimatedDuration ? `${focusTask.estimatedDuration} min` : 'Focus'}
                    </Text>
                    <Target size={14} color="#EAF1FF" />
                    <Text style={styles.focusMeta}>
                      {focusTask.priority === 'urgent' || focusTask.priority === 'high'
                        ? 'Deep Work'
                        : 'Task'}
                    </Text>
                  </View>
                </View>

                <View style={styles.focusFooter}>
                  <Text style={styles.focusCaption} numberOfLines={2}>
                    High impact task · Finish strong
                  </Text>
                  <View style={styles.playBlock}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={isFocusActive ? onPauseFocus : onStartFocus}
                      style={styles.playRing}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isFocusActive ? 'Pause focus timer' : 'Start focus timer'
                      }
                      accessibilityHint="Runs a timed focus session for the current task"
                    >
                      <View style={styles.playButton}>
                        {isFocusActive ? (
                          <Pause size={20} color={ACCENT.blue} fill={ACCENT.blue} />
                        ) : (
                          <Play size={22} color={ACCENT.blue} fill={ACCENT.blue} />
                        )}
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.startFocusText} numberOfLines={1}>
                      {isFocusActive ? 'Pause' : 'Start'}
                    </Text>
                    {isFocusActive ? (
                      <TouchableOpacity
                        onPress={onCompleteFocus}
                        style={styles.doneLink}
                        accessibilityRole="button"
                        accessibilityLabel="Mark focus task complete"
                      >
                        <Text style={styles.doneLinkText}>Done</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : focusHabit ? (
            <View style={styles.focusCard}>
              <View style={styles.focusTopRow}>
                <View style={[styles.focusPill, { backgroundColor: 'rgba(24,195,131,0.25)' }]}>
                  <Target size={15} color="#FFFFFF" />
                  <Text style={styles.focusPillText}>HABIT FOCUS</Text>
                </View>
                <TouchableOpacity onPress={onEditFocusHabit} hitSlop={12}>
                  <MoreHorizontal size={25} color="#DDE8FF" />
                </TouchableOpacity>
              </View>
              <View style={styles.focusBody}>
                <View style={styles.focusTextBlock}>
                  <Text style={styles.focusTitle} numberOfLines={3}>
                    {focusHabit.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Flame size={14} color="#EAF1FF" />
                    <Text style={styles.focusMeta}>
                      {focusHabit.habitStreak ? `${focusHabit.habitStreak} day streak` : 'Build your streak'}
                    </Text>
                  </View>
                </View>
                <View style={styles.playBlock}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={onCompleteFocusHabit}
                    style={[styles.playRing, { borderTopColor: ACCENT.green, borderRightColor: ACCENT.green }]}
                    accessibilityRole="button"
                    accessibilityLabel="Complete focus habit"
                  >
                    <View style={styles.playButton}>
                      <CheckCircle2 size={22} color={ACCENT.green} />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.startFocusText} numberOfLines={1}>
                    Complete
                  </Text>
                </View>
              </View>
              <Text style={[styles.habitFocusCaption, { color: '#D7E4FF' }]}>
                {incompleteHabitsCount === 1
                  ? '1 habit left today — tasks are done'
                  : `${incompleteHabitsCount} habits left today — tasks are done`}
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyFocusCard, { backgroundColor: surface, borderColor: border }]}>
              <Target size={36} color={muted} />
              <Text style={[styles.emptyFocusTitle, { color: colors.text }]}>All clear!</Text>
              <Text style={[styles.emptyFocusSubtitle, { color: muted }]}>
                Add a task or habit to get started
              </Text>
            </View>
          )}

          <View style={styles.quickAddWrap}>
            <View style={[styles.quickAddModeRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EEF0F4' }]}>
              <TouchableOpacity
                style={[styles.quickAddModeBtn, quickAddMode === 'task' && styles.quickAddModeBtnActive]}
                onPress={() => onQuickAddModeChange('task')}
              >
                <Text
                  style={[
                    styles.quickAddModeText,
                    quickAddMode === 'task' && styles.quickAddModeTextActive,
                  ]}
                >
                  Task
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAddModeBtn, quickAddMode === 'habit' && styles.quickAddModeBtnActive]}
                onPress={() => onQuickAddModeChange('habit')}
              >
                <Text
                  style={[
                    styles.quickAddModeText,
                    quickAddMode === 'habit' && styles.quickAddModeTextActive,
                  ]}
                >
                  Habit
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.quickAdd, { backgroundColor: surface }]}>
              <Sparkles size={24} color={ACCENT.blue} />
              <TextInput
                placeholder={quickAddMode === 'habit' ? 'Quick add habit...' : 'Quick add task...'}
                placeholderTextColor={muted}
                style={[styles.quickInput, { color: colors.text }]}
                value={quickTaskTitle}
                onChangeText={onQuickTaskTitleChange}
                onSubmitEditing={onQuickAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addButton, { opacity: quickTaskTitle.trim() ? 1 : 0.45 }]}
                onPress={onQuickAdd}
                disabled={!quickTaskTitle.trim()}
              >
                <Plus size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={aiActionable ? 0.85 : 1}
            onPress={aiActionable ? onAISuggestionPress : undefined}
            style={[styles.aiCard, { backgroundColor: isDark ? 'rgba(24,195,131,0.12)' : '#EAFBF4' }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.aiLabel}>✦ AI Suggestion</Text>
              <Text style={[styles.aiText, { color: isDark ? colors.text : '#2A3038' }]}>
                {aiSuggestion}{' '}
                <Text style={{ fontWeight: '800' }}>{aiSuggestionBold}</Text>
              </Text>
              {aiActionable ? (
                <Text style={styles.aiTapHint}>Tap to act on this suggestion</Text>
              ) : null}
            </View>
            <View style={[styles.aiIcon, { backgroundColor: isDark ? 'rgba(24,195,131,0.2)' : '#D5F7E9' }]}>
              <TrendingUp size={26} color={ACCENT.green} />
            </View>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            {completionFeedback?.visible ? (
              <HabitCompletionToast
                feedback={completionFeedback}
                onDismiss={onDismissCompletionFeedback}
              />
            ) : null}
            <TodayCompletionLog items={todayLog} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today</Text>
            <TouchableOpacity onPress={onSeeAllTasks}>
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[styles.segmented, { backgroundColor: surface, borderColor: border }]}
            accessibilityRole="tablist"
            accessibilityLabel="Filter today list by type"
          >
            {(
              [
                { id: 'all' as const, label: 'All', icon: ListChecks },
                { id: 'tasks' as const, label: 'Tasks', icon: CheckCircle2 },
                { id: 'habits' as const, label: 'Habits', icon: Target },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const selected = todaySourceFilter === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.segment, selected && styles.segmentActive]}
                  onPress={() => onTodaySourceFilterChange(id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${label} filter`}
                >
                  <Icon size={15} color={selected ? '#FFFFFF' : '#8E95A3'} />
                  <Text
                    style={selected ? styles.segmentActiveText : styles.segmentText}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[styles.statusSegmented, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF0F4' }]}
            accessibilityRole="tablist"
            accessibilityLabel="Filter today list by status"
          >
            <TouchableOpacity
              style={[styles.statusSegment, todayStatusFilter === 'open' && styles.statusSegmentActive]}
              onPress={() => onTodayStatusFilterChange('open')}
              accessibilityRole="tab"
              accessibilityState={{ selected: todayStatusFilter === 'open' }}
              accessibilityLabel={`Open items, ${todaySourceFilter === 'all' ? allOpenCount : todaySourceFilter === 'tasks' ? tasksOpenCount : habitsOpenCount}`}
            >
              <Text
                style={[
                  styles.statusSegmentText,
                  todayStatusFilter === 'open' && styles.statusSegmentTextActive,
                ]}
              >
                Open (
                {todaySourceFilter === 'all'
                  ? allOpenCount
                  : todaySourceFilter === 'tasks'
                    ? tasksOpenCount
                    : habitsOpenCount}
                )
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusSegment, todayStatusFilter === 'done' && styles.statusSegmentActive]}
              onPress={() => onTodayStatusFilterChange('done')}
              accessibilityRole="tab"
              accessibilityState={{ selected: todayStatusFilter === 'done' }}
              accessibilityLabel={`Completed items, ${doneCountForFilter}`}
            >
              <Text
                style={[
                  styles.statusSegmentText,
                  todayStatusFilter === 'done' && styles.statusSegmentTextActive,
                ]}
              >
                Done ({doneCountForFilter})
              </Text>
            </TouchableOpacity>
          </View>

          {todayStatusFilter === 'done' ? (
            <View style={styles.doneScopeRow}>
              <View
                style={[styles.doneScopeSegmented, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF0F4' }]}
                accessibilityRole="tablist"
                accessibilityLabel="Completed time range"
              >
                <TouchableOpacity
                  style={[
                    styles.doneScopeSegment,
                    todayDoneScope === 'today' && styles.doneScopeSegmentActive,
                  ]}
                  onPress={() => onTodayDoneScopeChange('today')}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: todayDoneScope === 'today' }}
                  accessibilityLabel="Completed today"
                >
                  <Text
                    style={[
                      styles.doneScopeText,
                      todayDoneScope === 'today' && styles.doneScopeTextActive,
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.doneScopeSegment,
                    todayDoneScope === 'week' && styles.doneScopeSegmentActive,
                  ]}
                  onPress={() => onTodayDoneScopeChange('week')}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: todayDoneScope === 'week' }}
                  accessibilityLabel="Completed this week"
                >
                  <Text
                    style={[
                      styles.doneScopeText,
                      todayDoneScope === 'week' && styles.doneScopeTextActive,
                    ]}
                  >
                    This week
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={onViewCompletionHistory}
                accessibilityRole="button"
                accessibilityLabel="View all completed tasks"
              >
                <Text style={styles.historyLink}>All history</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={[styles.planCard, { backgroundColor: surface }]}>
            {todayPlanItems.length === 0 ? (
              <Text style={[styles.emptyPlanText, { color: muted }]}>
                {todayStatusFilter === 'done'
                  ? todayDoneScope === 'week'
                    ? 'Nothing completed this week yet'
                    : 'Nothing completed today yet'
                  : 'Nothing on your list'}
              </Text>
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
                  weeklyProgressLabel={
                    item.kind === 'habit'
                      ? weeklyProgressByHabitId[item.task.id]
                      : undefined
                  }
                  isLast={index === todayPlanItems.length - 1}
                />
              ))
            )}
          </View>

          <TouchableOpacity
            style={[styles.viewAllRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F6FA' }]}
            onPress={onViewAllHabits}
          >
            <Text style={[styles.viewAllText, { color: colors.text }]}>View all habits</Text>
            <Text style={[styles.chevron, { color: colors.text }]}>›</Text>
          </TouchableOpacity>

          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={[styles.toolChip, { backgroundColor: surface, borderColor: border }]}
              onPress={onOpenPeakScheduler}
              activeOpacity={0.85}
            >
              <Zap size={16} color={ACCENT.blue} />
              <Text style={[styles.toolChipText, { color: colors.text }]}>Schedule peak block</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolChip, { backgroundColor: surface, borderColor: border }]}
              onPress={onOpenHabitCoach}
              activeOpacity={0.85}
            >
              <Target size={16} color={ACCENT.green} />
              <Text style={[styles.toolChipText, { color: colors.text }]}>Habit coach</Text>
            </TouchableOpacity>
          </View>

          {showHabitCoach ? (
            <View style={styles.habitCoachWrap}>
              <HabitFormationCoach maxItems={3} />
            </View>
          ) : null}

          <View style={[styles.dayCard, { backgroundColor: surface }]}>
            <View style={styles.cardHeader}>
              <View style={styles.inlineTitle}>
                <Clock3 size={21} color={colors.text} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Your Day</Text>
              </View>
            </View>

            {timeBlocks.map((block) => (
              <TimelineRow
                key={block.id}
                icon={block.icon}
                title={block.label}
                subtitle={block.subtitle}
                status={block.status}
                done={block.status === 'Done'}
                current={block.status === 'Current'}
                cardBg={timelineActiveBg}
                mutedColor={muted}
                textColor={colors.text}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 22,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerStacked: {
    flexDirection: 'column',
    marginBottom: 0,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  headerMainStacked: {
    paddingRight: 0,
    width: '100%',
  },
  compactStats: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  },
  miniStat: {
    alignItems: 'center',
    minWidth: 66,
  },
  statIconValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statValue: {
    fontSize: 28,
    color: '#16181D',
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 39,
  },
  momentumWrap: {
    alignItems: 'center',
    marginTop: 6,
    flexShrink: 0,
    width: 108,
  },
  momentumWrapCentered: {
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  ringOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    gap: 1,
  },
  ringPercent: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  ringLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.35,
    textAlign: 'center',
    width: '100%',
  },
  momentumBreakdown: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
    maxWidth: 108,
  },
  momentumHint: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 108,
    opacity: 0.85,
  },
  peakPill: {
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    maxWidth: 140,
  },
  peakText: {
    fontWeight: '700',
    fontSize: 11,
    flexShrink: 1,
  },
  focusCard: {
    marginTop: 24,
    borderRadius: 23,
    backgroundColor: ACCENT.navy,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#123473',
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 13 },
    elevation: 8,
  },
  emptyFocusCard: {
    marginTop: 24,
    borderRadius: 23,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyFocusTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyFocusSubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  focusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
  },
  focusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  focusBody: {
    marginTop: 18,
    gap: 14,
  },
  focusTextBlock: {
    width: '100%',
  },
  focusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  focusTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 13,
    flexWrap: 'wrap',
  },
  focusMeta: {
    color: '#EEF4FF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 7,
  },
  focusCaption: {
    flex: 1,
    minWidth: 0,
    color: '#D7E4FF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    paddingRight: 8,
  },
  playBlock: {
    alignItems: 'center',
    flexShrink: 0,
    width: 72,
  },
  playRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 5,
    borderTopColor: ACCENT.cyan,
    borderRightColor: ACCENT.blue,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startFocusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 72,
  },
  doneLink: {
    marginTop: 6,
  },
  doneLinkText: {
    color: '#D7E4FF',
    fontSize: 12,
    fontWeight: '700',
  },
  habitFocusCaption: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  quickAddWrap: {
    marginTop: 23,
    gap: 10,
  },
  quickAddModeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    alignSelf: 'flex-start',
  },
  quickAddModeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickAddModeBtnActive: {
    backgroundColor: ACCENT.navy,
  },
  quickAddModeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6F7480',
  },
  quickAddModeTextActive: {
    color: '#FFFFFF',
  },
  quickAdd: {
    height: 72,
    borderRadius: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1A2333',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  quickInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 13,
  },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: ACCENT.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCard: {
    marginTop: 20,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiLabel: {
    color: ACCENT.green,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  aiText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  aiTapHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT.green,
  },
  sectionHeader: {
    marginTop: 25,
    marginBottom: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
  },
  linkText: {
    color: ACCENT.blue,
    fontSize: 14,
    fontWeight: '800',
  },
  segmented: {
    minHeight: 49,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 4,
  },
  segmentActive: {
    backgroundColor: ACCENT.navy,
  },
  segmentText: {
    color: '#777D89',
    fontSize: 11,
    fontWeight: '800',
  },
  segmentActiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  statusSegmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
    gap: 4,
  },
  statusSegment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusSegmentActive: {
    backgroundColor: ACCENT.navy,
  },
  statusSegmentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6F7480',
  },
  statusSegmentTextActive: {
    color: '#FFFFFF',
  },
  doneScopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  doneScopeSegmented: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  doneScopeSegment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneScopeSegmentActive: {
    backgroundColor: ACCENT.navy,
  },
  doneScopeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6F7480',
  },
  doneScopeTextActive: {
    color: '#FFFFFF',
  },
  historyLink: {
    color: ACCENT.blue,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
  },
  planCard: {
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    shadowColor: '#1A2333',
    shadowOpacity: 0.045,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  emptyPlanText: {
    paddingVertical: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  taskRow: {
    minHeight: 65,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  taskRowActive: {
    backgroundColor: '#EFF5FF',
    borderRadius: 16,
    borderBottomWidth: 0,
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  taskMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  taskBadge: {
    minWidth: 48,
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 9,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusBadge: {
    backgroundColor: ACCENT.blue,
  },
  taskBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  toolChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  toolChipText: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  habitCoachWrap: {
    marginTop: 16,
  },
  dayCard: {
    width: '100%',
    borderRadius: 22,
    padding: 14,
    marginTop: 18,
    shadowColor: '#1A2333',
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 9 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inlineTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  viewAllRow: {
    marginTop: 12,
    height: 38,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '900',
  },
  chevron: {
    fontSize: 24,
    marginTop: -2,
  },
  timelineRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCurrent: {
    backgroundColor: '#DAEAFF',
  },
  timelineTitle: {
    flex: 1,
    minWidth: 0,
    fontWeight: '900',
    fontSize: 14,
  },
  timelineSubtitle: {
    marginTop: 4,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  timelineStatus: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '900',
  },
  zeroState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
  },
  zeroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  zeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  zeroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 280,
  },
  zeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT.green,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  zeroButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
