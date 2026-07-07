import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Bookmark, CalendarDays, PartyPopper } from 'lucide-react-native';
import type { EventStatsSummary } from '@/utils/eventStats';
import type { EventsPalette } from '@/utils/eventsPalette';

interface EventsStatsRowProps {
  stats: EventStatsSummary;
  palette: EventsPalette;
}

export const EventsStatsRow = React.memo(function EventsStatsRow({
  stats,
  palette,
}: EventsStatsRowProps) {
  const items = [
    { key: 'saved', label: 'Events Saved', value: stats.saved, icon: Bookmark, color: palette.primary },
    { key: 'attended', label: 'Attended', value: stats.attended, icon: PartyPopper, color: palette.secondary },
    { key: 'month', label: 'This Month', value: stats.thisMonth, icon: CalendarDays, color: palette.success },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <View
            key={item.key}
            style={[styles.chip, { borderColor: palette.border, backgroundColor: `${palette.card}CC` }]}
          >
            <BlurView intensity={28} tint={palette.blurTint} style={styles.blur}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}18` }]}>
                <Icon size={14} color={item.color} />
              </View>
              <Text style={[styles.value, { color: palette.text }]}>{item.value}</Text>
              <Text style={[styles.label, { color: palette.textSecondary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </BlurView>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  blur: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
