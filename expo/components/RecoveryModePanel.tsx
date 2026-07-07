import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import {
  Heart,
  Sun,
  Droplets,
  Moon,
  BookOpen,
  MessageCircle,
  Sparkles,
  Wind,
  Dumbbell,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import type { RecoveryWellbeingLog } from '@/types/habit';
import type { DailyHopeCandidate } from '@/utils/dailyHope';
import type { RecoveryTimeOfDay } from '@/utils/recoveryMode';

type WellbeingKey = keyof Omit<RecoveryWellbeingLog, 'date' | 'mood' | 'sleep'>;

const WELLBEING_TILES: {
  key: WellbeingKey;
  label: string;
  emoji: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}[] = [
  { key: 'water', label: 'Water', emoji: '💧', Icon: Droplets },
  { key: 'outside', label: 'Outside', emoji: '☀️', Icon: Sun },
  { key: 'movement', label: 'Movement', emoji: '🏋️', Icon: Dumbbell },
  { key: 'social', label: 'People', emoji: '❤️', Icon: MessageCircle },
  { key: 'reading', label: 'Reading', emoji: '📖', Icon: BookOpen },
  { key: 'reflection', label: 'Reflect', emoji: '🙏', Icon: Wind },
];

type Props = {
  greeting: string;
  timeTip: string;
  timeOfDay: RecoveryTimeOfDay;
  dailyHope: DailyHopeCandidate | null;
  dailyWin: string;
  identityReminder: string | null;
  patternInsight?: string | null;
  wellbeingLog?: RecoveryWellbeingLog;
  onToggleWellbeing: (key: WellbeingKey) => void;
  onSetMood: (mood: NonNullable<RecoveryWellbeingLog['mood']>) => void;
  onSetSleep: (sleep: NonNullable<RecoveryWellbeingLog['sleep']>) => void;
  onExit?: () => void;
};

export default function RecoveryModePanel({
  greeting,
  timeTip,
  timeOfDay,
  dailyHope,
  dailyWin,
  identityReminder,
  patternInsight,
  wellbeingLog,
  onToggleWellbeing,
  onSetMood,
  onSetSleep,
  onExit,
}: Props) {
  const { colors, isDark } = useTheme();

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const accent = isDark ? '#F472B6' : '#DB2777';
  const gradient = isDark
    ? (['#3B1F3A', '#1E1B2E'] as const)
    : (['#FDF2F8', '#F5F3FF'] as const);

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[...gradient]} style={styles.hero}>
        <View style={styles.heroBadgeRow}>
          <View style={[styles.badge, { backgroundColor: accent + '22' }]}>
            <Heart size={14} color={accent} fill={accent} />
            <Text style={[styles.badgeText, { color: accent }]}>Recovery Mode</Text>
          </View>
          <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>
            {timeOfDay === 'morning' ? 'Morning' : timeOfDay === 'afternoon' ? 'Afternoon' : 'Evening'}
          </Text>
        </View>

        <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
        <Text style={[styles.timeTip, { color: colors.textSecondary }]}>{timeTip}</Text>

        {dailyHope ? (
          <View
            style={[
              styles.hopeCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                borderColor: accent + '33',
              },
            ]}
          >
            <Sparkles size={16} color={accent} />
            <View style={styles.hopeTextWrap}>
              <Text style={[styles.hopeLabel, { color: accent }]}>Daily Hope</Text>
              <Text style={[styles.hopeHeadline, { color: colors.text }]}>{dailyHope.headline}</Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.winCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.winLabel, { color: colors.textTertiary }]}>Today&apos;s goal</Text>
          <Text style={[styles.winText, { color: colors.text }]}>{dailyWin}</Text>
        </View>

        {identityReminder ? (
          <Text style={[styles.identity, { color: colors.textSecondary }]}>{identityReminder}</Text>
        ) : null}

        {patternInsight ? (
          <Text style={[styles.pattern, { color: colors.textTertiary }]}>{patternInsight}</Text>
        ) : null}
      </LinearGradient>

      <View style={[styles.dashboard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.dashboardTitle, { color: colors.text }]}>Wellbeing today</Text>
        <Text style={[styles.dashboardSub, { color: colors.textSecondary }]}>
          Small signals, not streaks. Tap what feels true.
        </Text>

        <View style={styles.moodRow}>
          {(['low', 'okay', 'good'] as const).map((mood) => {
            const selected = wellbeingLog?.mood === mood;
            const label = mood === 'low' ? '😔 Low' : mood === 'okay' ? '😐 Okay' : '🙂 Good';
            return (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.moodPill,
                  {
                    borderColor: selected ? accent : colors.border,
                    backgroundColor: selected ? accent + '18' : colors.surfaceSecondary,
                  },
                ]}
                onPress={() => {
                  haptic();
                  onSetMood(mood);
                }}
              >
                <Text style={[styles.moodPillText, { color: selected ? accent : colors.textSecondary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.tileGrid}>
          {WELLBEING_TILES.map(({ key, label, emoji, Icon }) => {
            const done = !!wellbeingLog?.[key];
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tile,
                  {
                    borderColor: done ? accent : colors.border,
                    backgroundColor: done ? accent + '12' : colors.surfaceSecondary,
                  },
                ]}
                onPress={() => {
                  haptic();
                  onToggleWellbeing(key);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: done }}
              >
                <Text style={styles.tileEmoji}>{emoji}</Text>
                <Icon size={14} color={done ? accent : colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.tileLabel, { color: done ? colors.text : colors.textSecondary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sleepRow}>
          <Moon size={16} color={colors.textTertiary} />
          <Text style={[styles.sleepLabel, { color: colors.textSecondary }]}>Sleep last night</Text>
          <View style={styles.sleepPills}>
            {(['poor', 'fair', 'good'] as const).map((sleep) => {
              const selected = wellbeingLog?.sleep === sleep;
              return (
                <TouchableOpacity
                  key={sleep}
                  style={[
                    styles.sleepPill,
                    {
                      borderColor: selected ? accent : colors.border,
                      backgroundColor: selected ? accent + '18' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    haptic();
                    onSetSleep(sleep);
                  }}
                >
                  <Text style={[styles.sleepPillText, { color: selected ? accent : colors.textTertiary }]}>
                    {sleep}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {onExit ? (
          <TouchableOpacity style={styles.exitBtn} onPress={onExit} activeOpacity={0.8}>
            <Text style={[styles.exitText, { color: accent }]}>I&apos;m feeling a bit better</Text>
            <ChevronRight size={16} color={accent} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  timeTip: {
    fontSize: 14,
    lineHeight: 20,
  },
  hopeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  hopeTextWrap: {
    flex: 1,
    gap: 2,
  },
  hopeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hopeHeadline: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  winCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
  },
  winLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  winText: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  identity: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    marginTop: 2,
  },
  pattern: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  dashboard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  dashboardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  dashboardSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  moodPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  tileEmoji: {
    fontSize: 18,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  sleepLabel: {
    fontSize: 13,
    flex: 1,
  },
  sleepPills: {
    flexDirection: 'row',
    gap: 6,
  },
  sleepPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sleepPillText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  exitText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
