import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, Flame, Target, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { DailySummary } from '@/utils/dailySummary';
import type { DailyStatsDelta } from '@/utils/dailySummaryStats';

interface DailySummaryInsightsProps {
  summary: DailySummary;
  yesterdayDelta?: DailyStatsDelta | null;
}

function InsightSection({
  title,
  icon,
  items,
  accentColor,
  textColor,
  mutedColor,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  accentColor: string;
  textColor: string;
  mutedColor: string;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={[styles.sectionTitle, { color: mutedColor }]}>{title}</Text>
      </View>
      {items.map((item, idx) => (
        <View key={`${title}-${idx}`} style={[styles.chip, { backgroundColor: accentColor }]}>
          <Text style={[styles.chipText, { color: textColor }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DailySummaryInsights({
  summary,
  yesterdayDelta,
}: DailySummaryInsightsProps) {
  const { colors, isDark } = useTheme();

  const wins = (summary.wins ?? []).filter(Boolean);
  const challenges = (summary.challenges ?? []).filter(Boolean);
  const streaks = (summary.streaks ?? []).filter((s) => s.name && s.length > 0);

  if (wins.length === 0 && challenges.length === 0 && streaks.length === 0 && !yesterdayDelta) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {yesterdayDelta ? (
        <View
          style={[
            styles.deltaRow,
            {
              backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
              borderColor: colors.border,
            },
          ]}
        >
          {yesterdayDelta.improved ? (
            <TrendingUp size={14} color="#059669" strokeWidth={2.5} />
          ) : (
            <TrendingDown size={14} color={colors.textTertiary} strokeWidth={2.5} />
          )}
          <View style={styles.deltaCopy}>
            <Text style={[styles.deltaTitle, { color: colors.text }]}>Vs yesterday</Text>
            <Text style={[styles.deltaLine, { color: colors.textSecondary }]}>
              {yesterdayDelta.habitsLabel}
            </Text>
            {yesterdayDelta.tasksLabel ? (
              <Text style={[styles.deltaLine, { color: colors.textSecondary }]}>
                {yesterdayDelta.tasksLabel}
              </Text>
            ) : null}
            {yesterdayDelta.scoreLabel ? (
              <Text style={[styles.deltaLine, { color: colors.textTertiary }]}>
                {yesterdayDelta.scoreLabel}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <InsightSection
        title="Wins"
        icon={<Trophy size={13} color="#F59E0B" strokeWidth={2.5} />}
        items={wins}
        accentColor={isDark ? 'rgba(245, 158, 11, 0.14)' : '#FEF9EE'}
        textColor={colors.text}
        mutedColor={colors.textTertiary}
      />

      <InsightSection
        title="Streaks"
        icon={<Flame size={13} color="#EF4444" strokeWidth={2.5} />}
        items={streaks.map((s) => `${s.name} · ${s.length} day${s.length === 1 ? '' : 's'}`)}
        accentColor={isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2'}
        textColor={colors.text}
        mutedColor={colors.textTertiary}
      />

      <InsightSection
        title="Still open"
        icon={<Target size={13} color="#6366F1" strokeWidth={2.5} />}
        items={challenges}
        accentColor={isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF'}
        textColor={colors.text}
        mutedColor={colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    gap: 12,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  deltaCopy: {
    flex: 1,
    gap: 2,
  },
  deltaTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  deltaLine: {
    fontSize: 12,
    lineHeight: 17,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
