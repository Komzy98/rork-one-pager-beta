import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, ChevronDown, ChevronUp, ListChecks } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { TodayLogItem } from '@/utils/todayHabits';

interface TodayCompletionLogProps {
  items: TodayLogItem[];
}

export default function TodayCompletionLog({ items }: TodayCompletionLogProps) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(items.length > 0 && items.length <= 4);

  if (items.length === 0) return null;

  const preview = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <ListChecks size={14} color="#059669" strokeWidth={2.5} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Today&apos;s log</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{items.length}</Text>
          </View>
        </View>
        {hasMore ? (
          expanded ? (
            <ChevronUp size={16} color={colors.textTertiary} />
          ) : (
            <ChevronDown size={16} color={colors.textTertiary} />
          )
        ) : null}
      </TouchableOpacity>

      <View style={styles.list}>
        {preview.map((item) => (
          <View key={item.id} style={styles.row}>
            <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {(item.streak && item.streak > 0) || item.weeklyLabel ? (
                <Text style={[styles.rowMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                  {item.kind === 'habit' && item.streak && item.streak > 0
                    ? `${item.streak}d streak`
                    : ''}
                  {item.streak && item.streak > 0 && item.weeklyLabel ? ' · ' : ''}
                  {item.weeklyLabel ?? ''}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.kindDot,
                { backgroundColor: item.color ?? (item.kind === 'task' ? '#007AFF' : '#F59E0B') },
              ]}
            />
          </View>
        ))}
      </View>

      {!expanded && hasMore ? (
        <Text style={[styles.moreHint, { color: colors.textTertiary }]}>
          +{items.length - 3} more — tap to expand
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  countPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCopy: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 11,
  },
  kindDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreHint: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
});
