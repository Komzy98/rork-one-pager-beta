import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { HabitAccountabilitySection } from '@/components/social/HabitAccountabilitySection';
import HabitIcon from '@/components/HabitIcon';
import type { Task } from '@/types/task';

interface TaskHabitPartnerScreenProps {
  task: Task;
}

/** Routine habits from Discover / tasks store (not legacy goals store). */
export function TaskHabitPartnerScreen({ task }: TaskHabitPartnerScreenProps) {
  const { colors } = useTheme();
  const habitColor = task.color || colors.primary;

  const cardColors = {
    text: colors.text,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textTertiary,
    card: colors.card,
    border: colors.border,
    primary: colors.primary,
    surfaceSecondary: colors.surfaceSecondary,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Accountability',
          headerBackTitle: 'Back',
          headerTintColor: colors.primary,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: habitColor }]}>
          <View style={styles.iconWrap}>
            <HabitIcon name={task.icon || 'target'} color="#FFFFFF" size={32} />
          </View>
          <Text style={styles.heroTitle}>{task.title}</Text>
          {task.description ? (
            <Text style={styles.heroSubtitle} numberOfLines={3}>
              {task.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.introRow}>
            <Users size={18} color={colors.primary} />
            <Text style={[styles.introText, { color: colors.textSecondary }]}>
              Invite a partner to see check-ins for this habit only. Your other habits and events stay private unless you share them separately.
            </Text>
          </View>

          <HabitAccountabilitySection
            habitId={task.id}
            habitName={task.title}
            colors={cardColors}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
