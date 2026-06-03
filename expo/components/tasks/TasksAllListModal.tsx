import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { Task, TaskPriority, TaskStatus } from '@/types/task';
import type { ThemeColors } from '@/types/theme';
import SwipeablePlanTaskRow from './SwipeablePlanTaskRow';

const ACCENT = { blue: '#3578F6', navy: '#112C63' };

type StatusFilter = 'all' | TaskStatus;
type PriorityFilter = 'all' | TaskPriority;
type DueFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none';

interface TasksAllListModalProps {
  visible: boolean;
  onClose: () => void;
  initialStatusFilter?: StatusFilter;
  tasks: Task[];
  colors: ThemeColors;
  isDark: boolean;
  focusedTaskId: string | null;
  getTaskColor: (task: Task) => string;
  getTaskMeta: (task: Task) => string;
  onTaskPress: (task: Task) => void;
  onTaskComplete: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  onSetInProgress: (task: Task) => void;
  onSetFocus: (taskId: string) => void;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function TasksAllListModal({
  visible,
  onClose,
  initialStatusFilter = 'all',
  tasks,
  colors,
  isDark,
  focusedTaskId,
  getTaskColor,
  getTaskMeta,
  onTaskPress,
  onTaskComplete,
  onTaskDelete,
  onSetInProgress,
  onSetFocus,
}: TasksAllListModalProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');

  useEffect(() => {
    if (visible) {
      setStatusFilter(initialStatusFilter);
    }
  }, [visible, initialStatusFilter]);

  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#E7EAF0';

  const filtered = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const now = new Date();

    return tasks
      .filter((t) => !t.isHabit)
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .filter((t) => priorityFilter === 'all' || t.priority === priorityFilter)
      .filter((t) => {
        if (dueFilter === 'all') return true;
        if (!t.dueDate) return dueFilter === 'none';
        const due = new Date(t.dueDate);
        if (dueFilter === 'overdue') return due < now && t.status !== 'completed';
        if (dueFilter === 'today') return due >= todayStart && due <= todayEnd;
        if (dueFilter === 'upcoming') return due > todayEnd;
        if (dueFilter === 'none') return false;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });
  }, [tasks, statusFilter, priorityFilter, dueFilter]);

  const FilterChip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        { borderColor: border, backgroundColor: active ? ACCENT.navy : surface },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? colors.background : '#F6F7FA' }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>All Tasks</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={[styles.closeBtn, { backgroundColor: surface }]}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip label="All status" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          <FilterChip label="To do" active={statusFilter === 'todo'} onPress={() => setStatusFilter('todo')} />
          <FilterChip
            label="In progress"
            active={statusFilter === 'in-progress'}
            onPress={() => setStatusFilter('in-progress')}
          />
          <FilterChip
            label="Completed"
            active={statusFilter === 'completed'}
            onPress={() => setStatusFilter('completed')}
          />
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="All priority"
            active={priorityFilter === 'all'}
            onPress={() => setPriorityFilter('all')}
          />
          {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
            <FilterChip
              key={p}
              label={p}
              active={priorityFilter === p}
              onPress={() => setPriorityFilter(p)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterRow, { marginBottom: 12 }]}
        >
          <FilterChip label="Any due" active={dueFilter === 'all'} onPress={() => setDueFilter('all')} />
          <FilterChip label="Overdue" active={dueFilter === 'overdue'} onPress={() => setDueFilter('overdue')} />
          <FilterChip label="Due today" active={dueFilter === 'today'} onPress={() => setDueFilter('today')} />
          <FilterChip label="Upcoming" active={dueFilter === 'upcoming'} onPress={() => setDueFilter('upcoming')} />
          <FilterChip label="No date" active={dueFilter === 'none'} onPress={() => setDueFilter('none')} />
        </ScrollView>

        <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
          {filtered.length} task{filtered.length === 1 ? '' : 's'}
        </Text>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <View style={[styles.listCard, { backgroundColor: surface }]}>
            {filtered.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>No tasks match these filters</Text>
            ) : (
              filtered.map((task, index) => (
                <SwipeablePlanTaskRow
                  key={task.id}
                  task={task}
                  taskColor={getTaskColor(task)}
                  textColor={colors.text}
                  mutedColor={colors.textSecondary}
                  borderColor={border}
                  isDark={isDark}
                  isFocusRow={task.id === focusedTaskId}
                  isCompleted={task.status === 'completed'}
                  meta={getTaskMeta(task)}
                  onPress={() => onTaskPress(task)}
                  onComplete={() => onTaskComplete(task)}
                  onDelete={() => onTaskDelete(task)}
                  onSetInProgress={() => onSetInProgress(task)}
                  onSetFocus={() => onSetFocus(task.id)}
                  isLast={index === filtered.length - 1}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: '900' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: { maxHeight: 44 },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  countLabel: {
    paddingHorizontal: 20,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  listCard: { borderRadius: 22, paddingHorizontal: 8, paddingVertical: 8 },
  empty: { padding: 28, textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
