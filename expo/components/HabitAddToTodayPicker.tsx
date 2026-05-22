import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Plus, Check, Clock, Sparkles, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSavedHabits } from '@/hooks/useHabitsEnhancement';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import type { CommunityHabit } from '@/types/habit';
import {
  getTodayHabitSuggestions,
  getFrequencyLabel,
  isCommunityHabitScheduledToday,
} from '@/utils/habitDiscovery';

type Variant = 'empty' | 'fill-slot';

interface HabitAddToTodayPickerProps {
  variant?: Variant;
  /** How many open habit slots to fill (caps suggestion count). */
  emptySlots?: number;
  maxSuggestions?: number;
  onHabitAdded?: (habit: CommunityHabit) => void;
}

export default function HabitAddToTodayPicker({
  variant = 'empty',
  emptySlots = 1,
  maxSuggestions = 4,
  onHabitAdded,
}: HabitAddToTodayPickerProps) {
  const { colors, isDark } = useTheme();
  const { addCommunityHabit, isHabitSaved, communityHabitIds } = useSavedHabits();
  const { habits: legacyHabits } = useApp();
  const { allTasks } = useTasks();
  const [addingId, setAddingId] = React.useState<string | null>(null);

  const pickCount = Math.max(1, Math.min(maxSuggestions, emptySlots));

  const userHabitContext = useMemo(() => {
    const fromTasks = (allTasks || [])
      .filter((t) => t.isHabit)
      .map((t) => ({ category: t.category, tags: t.tags }));
    const fromLegacy = (legacyHabits || []).map((h) => ({
      category: (h as { category?: string }).category,
      tags: (h as { tags?: string[] }).tags,
    }));
    return [...fromTasks, ...fromLegacy];
  }, [allTasks, legacyHabits]);

  const suggestions = useMemo(
    () => getTodayHabitSuggestions(userHabitContext, communityHabitIds, pickCount),
    [userHabitContext, communityHabitIds, pickCount]
  );

  const handleAdd = useCallback(
    async (habit: CommunityHabit) => {
      if (isHabitSaved(habit.id) || addingId) return;
      setAddingId(habit.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        addCommunityHabit(habit);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onHabitAdded?.(habit);
      } finally {
        setAddingId(null);
      }
    },
    [addCommunityHabit, isHabitSaved, addingId, onHabitAdded]
  );

  if (suggestions.length === 0) {
    return (
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={[styles.browseLink, { borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/discover' as any)}
          activeOpacity={0.8}
        >
          <Text style={[styles.browseLinkText, { color: colors.primary }]}>Browse all habits</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  const isCompact = variant === 'fill-slot';

  return (
    <View style={[styles.wrap, isCompact && styles.wrapCompact]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Sparkles size={14} color={colors.primary} strokeWidth={2.5} />
          <Text style={[styles.title, { color: colors.text }]}>
            {isCompact ? 'Add to today' : 'Pick a habit for today'}
          </Text>
        </View>
        {!isCompact && emptySlots > 1 ? (
          <Text style={[styles.slotHint, { color: colors.textTertiary }]}>
            {emptySlots} open {emptySlots === 1 ? 'slot' : 'slots'}
          </Text>
        ) : null}
      </View>

      {!isCompact ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          One tap adds it to your routine — scheduled for today when applicable.
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((habit) => {
          const added = isHabitSaved(habit.id);
          const loading = addingId === habit.id;
          const dueToday = isCommunityHabitScheduledToday(habit);

          return (
            <View
              key={habit.id}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#FAFBFC',
                  borderColor: colors.border,
                },
                added && {
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.35)',
                },
              ]}
            >
              <View style={[styles.iconBadge, { backgroundColor: habit.color + '22' }]}>
                <View style={[styles.iconDot, { backgroundColor: habit.color }]} />
              </View>
              <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
                {habit.name}
              </Text>
              <View style={styles.metaRow}>
                {habit.estimatedDuration ? (
                  <View style={styles.metaPill}>
                    <Clock size={9} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                      {habit.estimatedDuration}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                  {getFrequencyLabel(habit.frequency.days)}
                </Text>
              </View>
              {dueToday ? (
                <Text style={[styles.todayBadge, { color: colors.primary }]}>Due today</Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  { backgroundColor: added ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5') : colors.primary },
                ]}
                onPress={() => void handleAdd(habit)}
                disabled={added || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={added ? '#059669' : '#fff'} />
                ) : added ? (
                  <>
                    <Check size={14} color="#059669" strokeWidth={2.5} />
                    <Text style={styles.addBtnTextAdded}>Added</Text>
                  </>
                ) : (
                  <>
                    <Plus size={14} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.addBtnText}>Add to today</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.browseLink}
        onPress={() => router.push('/(tabs)/discover' as any)}
        activeOpacity={0.8}
      >
        <Text style={[styles.browseLinkText, { color: colors.textTertiary }]}>Browse full catalog</Text>
        <ChevronRight size={14} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  wrapCompact: {
    marginTop: 4,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  slotHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 4,
    paddingBottom: 4,
  },
  card: {
    width: 152,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  todayBadge: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 'auto',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addBtnTextAdded: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  browseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 10,
    paddingVertical: 4,
  },
  browseLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
