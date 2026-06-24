import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CalendarDays, Clock3, Sparkles, ChevronRight } from 'lucide-react-native';
import type { ThemeColors } from '@/types/theme';
import type { HabitTimeRecommendation } from '@/utils/calendarHabitSlots';

const ACCENT = {
  green: '#18C383',
  blue: '#3578F6',
};

interface Props {
  colors: ThemeColors;
  isDark: boolean;
  isCalendarAvailable: boolean;
  isConnected: boolean;
  isLoading: boolean;
  todayEventCount: number;
  recommendations: HabitTimeRecommendation[];
  onConnectPress: () => void;
  onManageCalendarsPress: () => void;
}

export default function CalendarHabitPlanner({
  colors,
  isDark,
  isCalendarAvailable,
  isConnected,
  isLoading,
  todayEventCount,
  recommendations,
  onConnectPress,
  onManageCalendarsPress,
}: Props) {
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F4F6FA';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E6E9EF';
  const muted = isDark ? colors.textSecondary : '#6B7280';

  if (!isCalendarAvailable) {
    return null;
  }

  if (!isConnected) {
    return (
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(53,120,246,0.18)' : '#E8F0FF' }]}>
            <CalendarDays size={18} color={ACCENT.blue} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>Smart habit timing</Text>
            <Text style={[styles.subtitle, { color: muted }]}>
              Connect your calendar and we&apos;ll find the best free windows for today&apos;s habits.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.cta} onPress={onConnectPress} activeOpacity={0.85}>
          <Sparkles size={16} color="#FFFFFF" />
          <Text style={styles.ctaText}>Connect calendar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topPicks = recommendations.slice(0, 3);

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(24,195,131,0.18)' : '#EAFBF4' }]}>
          <CalendarDays size={18} color={ACCENT.green} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Best times today</Text>
          <Text style={[styles.subtitle, { color: muted }]}>
            {todayEventCount > 0
              ? `Based on ${todayEventCount} calendar event${todayEventCount === 1 ? '' : 's'} + your rhythm`
              : 'Open day on your calendar — habits fit around your peak hours'}
          </Text>
        </View>
        <TouchableOpacity onPress={onManageCalendarsPress} hitSlop={10}>
          <ChevronRight size={18} color={muted} />
        </TouchableOpacity>
      </View>

      {isLoading && topPicks.length === 0 ? (
        <ActivityIndicator color={ACCENT.green} style={{ marginVertical: 12 }} />
      ) : topPicks.length === 0 ? (
        <Text style={[styles.empty, { color: muted }]}>No habits due today — you&apos;re clear.</Text>
      ) : (
        <View style={styles.list}>
          {topPicks.map((rec) => (
            <View
              key={rec.habitId}
              style={[styles.row, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}
            >
              <View style={styles.timeCol}>
                <Clock3 size={14} color={ACCENT.green} />
                <Text style={[styles.timeText, { color: colors.text }]}>{rec.timeLabel}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.habitTitle, { color: colors.text }]} numberOfLines={1}>
                  {rec.habitTitle}
                </Text>
                <Text style={[styles.reason, { color: muted }]} numberOfLines={2}>
                  {rec.reasoning}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT.blue,
    borderRadius: 12,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  timeCol: {
    alignItems: 'center',
    width: 58,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reason: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  empty: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 4,
  },
});
