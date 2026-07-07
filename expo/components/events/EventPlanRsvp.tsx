import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, HelpCircle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { PlanRsvpStatus } from '@/utils/sharedPlansService';
import type { EventsPalette } from '@/utils/eventsPalette';

const OPTIONS: { status: PlanRsvpStatus; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { status: 'in', label: "I'm in", icon: Check },
  { status: 'maybe', label: 'Maybe', icon: HelpCircle },
  { status: 'cant', label: "Can't", icon: X },
];

interface EventPlanRsvpProps {
  palette: EventsPalette;
  myStatus: PlanRsvpStatus | null;
  goingCount: number;
  maybeCount: number;
  loading?: boolean;
  onSelect: (status: PlanRsvpStatus) => void | Promise<void>;
}

export const EventPlanRsvp = React.memo(function EventPlanRsvp({
  palette,
  myStatus,
  goingCount,
  maybeCount,
  loading = false,
  onSelect,
}: EventPlanRsvpProps) {
  const handlePress = useCallback(
    (status: PlanRsvpStatus) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void onSelect(status);
    },
    [onSelect]
  );

  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Are you going?</Text>
        <Text style={[styles.meta, { color: palette.textSecondary }]}>
          {goingCount} in{maybeCount > 0 ? ` · ${maybeCount} maybe` : ''}
        </Text>
      </View>
      <View style={styles.row}>
        {OPTIONS.map(({ status, label, icon: Icon }) => {
          const active = myStatus === status;
          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.chip,
                {
                  borderColor: active ? palette.primary : palette.border,
                  backgroundColor: active ? palette.primaryLight : palette.surfaceLight,
                },
              ]}
              onPress={() => handlePress(status)}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading && active ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <Icon size={14} color={active ? palette.primary : palette.textSecondary} />
              )}
              <Text style={[styles.chipText, { color: active ? palette.primary : palette.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
