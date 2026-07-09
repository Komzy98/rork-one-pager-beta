import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { EventsPalette } from '@/utils/eventsPalette';
import { appFont } from '@/constants/fonts';

interface EventPlanShortcutsProps {
  tonightCount: number;
  weekendCount: number;
  onAddTonight: () => void | Promise<void>;
  onBuildWeekend: () => void | Promise<void>;
  loading?: 'tonight' | 'weekend' | null;
  palette: EventsPalette;
  variant?: 'default' | 'compact';
}

export function EventPlanShortcuts({
  tonightCount,
  weekendCount,
  onAddTonight,
  onBuildWeekend,
  loading = null,
  palette,
  variant = 'default',
}: EventPlanShortcutsProps) {
  const showTonight = tonightCount > 0;
  const showWeekend = weekendCount > 0;
  if (!showTonight && !showWeekend) return null;

  const handleTonight = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void onAddTonight();
  }, [onAddTonight]);

  const handleWeekend = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void onBuildWeekend();
  }, [onBuildWeekend]);

  if (variant === 'compact') {
    return (
      <View style={styles.compactRow}>
        {showTonight ? (
          <TouchableOpacity
            style={[styles.compactChip, { backgroundColor: palette.primaryLight, borderColor: palette.border }]}
            onPress={handleTonight}
            disabled={loading === 'tonight'}
            activeOpacity={0.85}
          >
            {loading === 'tonight' ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Moon size={12} color={palette.primary} />
            )}
            <Text style={[styles.compactText, { color: palette.text }]}>Tonight · {tonightCount}</Text>
          </TouchableOpacity>
        ) : null}
        {showWeekend ? (
          <TouchableOpacity
            style={[styles.compactChip, { backgroundColor: palette.card, borderColor: palette.border }]}
            onPress={handleWeekend}
            disabled={loading === 'weekend'}
            activeOpacity={0.85}
          >
            {loading === 'weekend' ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <CalendarDays size={12} color={palette.primary} />
            )}
            <Text style={[styles.compactText, { color: palette.text }]}>Weekend · {weekendCount}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {showTonight ? (
        <TouchableOpacity
          style={[
            styles.chip,
            { backgroundColor: palette.primaryLight, borderColor: palette.border },
            showWeekend ? styles.chipHalf : styles.chipFull,
          ]}
          onPress={handleTonight}
          disabled={loading === 'tonight'}
          activeOpacity={0.85}
        >
          {loading === 'tonight' ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <Moon size={15} color={palette.primary} />
          )}
          <View style={styles.copy}>
            <Text style={[styles.title, { color: palette.text }]}>Add to tonight</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              {tonightCount} pick{tonightCount === 1 ? '' : 's'} for you
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {showWeekend ? (
        <TouchableOpacity
          style={[
            styles.chip,
            { backgroundColor: palette.card, borderColor: palette.border },
            showTonight ? styles.chipHalf : styles.chipFull,
          ]}
          onPress={handleWeekend}
          disabled={loading === 'weekend'}
          activeOpacity={0.85}
        >
          {loading === 'weekend' ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <CalendarDays size={15} color={palette.primary} />
          )}
          <View style={styles.copy}>
            <Text style={[styles.title, { color: palette.text }]}>Build my weekend</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              {weekendCount} event{weekendCount === 1 ? '' : 's'} lined up
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  compactChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  compactText: {
    ...appFont('600'),
    fontSize: 12,
    fontWeight: '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipHalf: {
    flex: 1,
  },
  chipFull: {
    flex: 1,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
});
