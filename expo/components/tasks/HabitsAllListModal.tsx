import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X, CheckCircle2, Circle } from 'lucide-react-native';
import type { Task } from '@/types/task';
import type { ThemeColors } from '@/types/theme';
import { shouldDoHabitToday } from '@/utils/dateUtils';

const ACCENT = { green: '#18C383' };

interface HabitsAllListModalProps {
  visible: boolean;
  onClose: () => void;
  habits: Task[];
  todayStr: string;
  colors: ThemeColors;
  isDark: boolean;
  onToggleHabit: (habit: Task) => void;
  onHabitPress: (habit: Task) => void;
  weeklyProgressByHabitId?: Record<string, string | undefined>;
}

export default function HabitsAllListModal({
  visible,
  onClose,
  habits,
  todayStr,
  colors,
  isDark,
  onToggleHabit,
  onHabitPress,
  weeklyProgressByHabitId = {},
}: HabitsAllListModalProps) {
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#E7EAF0';

  const { dueToday, other } = useMemo(() => {
    const due: Task[] = [];
    const rest: Task[] = [];
    habits.forEach((h) => {
      if (h.habitFrequency && shouldDoHabitToday(h.habitFrequency)) {
        due.push(h);
      } else {
        rest.push(h);
      }
    });
    return { dueToday: due, other: rest };
  }, [habits]);

  const renderHabit = (habit: Task, isLast: boolean) => {
    const doneToday = !!habit.habitCompletions?.[todayStr];
    const dueTodayFlag = habit.habitFrequency && shouldDoHabitToday(habit.habitFrequency);

    return (
      <TouchableOpacity
        key={habit.id}
        style={[styles.row, { borderBottomColor: border }, isLast && { borderBottomWidth: 0 }]}
        onPress={() => onHabitPress(habit)}
        activeOpacity={0.75}
      >
        <TouchableOpacity onPress={() => onToggleHabit(habit)} hitSlop={10}>
          {doneToday ? (
            <CheckCircle2 size={24} color={ACCENT.green} fill={ACCENT.green} />
          ) : (
            <Circle size={24} color={habit.color || ACCENT.green} />
          )}
        </TouchableOpacity>
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
            {habit.title}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
            {dueTodayFlag ? (doneToday ? 'Done today' : 'Due today') : 'Not scheduled today'}
            {weeklyProgressByHabitId[habit.id]
              ? ` · ${weeklyProgressByHabitId[habit.id]}`
              : habit.habitStreak
                ? ` · ${habit.habitStreak} day streak`
                : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? colors.background : '#F6F7FA' }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>All Habits</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={[styles.closeBtn, { backgroundColor: surface }]}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {dueToday.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Due today</Text>
              <View style={[styles.card, { backgroundColor: surface }]}>
                {dueToday.map((h, i) => renderHabit(h, i === dueToday.length - 1))}
              </View>
            </>
          ) : null}

          {other.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Other habits</Text>
              <View style={[styles.card, { backgroundColor: surface }]}>
                {other.map((h, i) => renderHabit(h, i === other.length - 1))}
              </View>
            </>
          ) : null}

          {habits.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No habits yet</Text>
          ) : null}
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
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  card: { borderRadius: 22, paddingHorizontal: 12, paddingVertical: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowMeta: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  empty: { textAlign: 'center', padding: 40, fontSize: 15 },
});
