import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, Calendar, ChevronRight, Clock, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { LocalEvent } from '@/types/events';
import { getEventCountdownLabel, getDaysUntilEvent } from '@/utils/eventDiscovery';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';
import type { EventsPalette } from '@/utils/eventsPalette';

interface PremiumEventListRowProps {
  event: LocalEvent;
  palette: EventsPalette;
  onPress: (eventId: string) => void;
  showCountdown?: boolean;
  trailing?: React.ReactNode;
  onRemind?: (event: LocalEvent) => void;
  onAddToCalendar?: (event: LocalEvent) => void;
}

export const PremiumEventListRow = React.memo(function PremiumEventListRow({
  event,
  palette,
  onPress,
  showCountdown = true,
  trailing,
  onRemind,
  onAddToCalendar,
}: PremiumEventListRowProps) {
  const categoryMeta = getEventCategoryMeta(event.category);
  const CategoryIcon = categoryMeta.icon;
  const countdown = getEventCountdownLabel(event);
  const daysUntil = getDaysUntilEvent(event);
  const urgent = showCountdown && daysUntil !== null && daysUntil >= 0 && daysUntil <= 2;

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(event.id);
  }, [event.id, onPress]);

  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <TouchableOpacity
        style={styles.row}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${categoryMeta.color}18` }]}>
          <CategoryIcon size={18} color={categoryMeta.color} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={11} color={palette.textMuted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Calendar size={11} color={palette.textMuted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]} numberOfLines={1}>
              {event.date} · {event.time}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          {showCountdown ? (
            <View
              style={[
                styles.countdownBadge,
                {
                  backgroundColor: urgent ? palette.errorLight : palette.primaryLight,
                },
              ]}
            >
              <Clock size={10} color={urgent ? palette.error : palette.primary} />
              <Text
                style={[
                  styles.countdownText,
                  { color: urgent ? palette.error : palette.primary },
                ]}
              >
                {countdown}
              </Text>
            </View>
          ) : null}
          {trailing ?? <ChevronRight size={16} color={palette.textMuted} />}
        </View>
      </TouchableOpacity>

      {onRemind || onAddToCalendar ? (
        <View style={[styles.actionRow, { borderTopColor: palette.border }]}>
          {onRemind ? (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: palette.border }]}
              onPress={() => onRemind(event)}
            >
              <Bell size={13} color={palette.textSecondary} />
              <Text style={[styles.actionBtnText, { color: palette.textSecondary }]}>Remind</Text>
            </TouchableOpacity>
          ) : null}
          {onAddToCalendar ? (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: palette.border }]}
              onPress={() => onAddToCalendar(event)}
            >
              <Calendar size={13} color={palette.textSecondary} />
              <Text style={[styles.actionBtnText, { color: palette.textSecondary }]}>Calendar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.15,
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
