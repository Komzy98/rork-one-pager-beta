import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import type { LocalEvent } from '@/types/events';
import type { SavedEventDayGroup } from '@/utils/savedEventsWeek';
import type { EventsPalette } from '@/utils/eventsPalette';

interface SavedEventsWeekTimelineProps {
  groups: SavedEventDayGroup[];
  palette: EventsPalette;
  onPressEvent: (eventId: string) => void;
}

export const SavedEventsWeekTimeline = React.memo(function SavedEventsWeekTimeline({
  groups,
  palette,
  onPressEvent,
}: SavedEventsWeekTimelineProps) {
  if (groups.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <CalendarDays size={16} color={palette.primary} />
        <Text style={[styles.title, { color: palette.text }]}>This week&apos;s plans</Text>
      </View>

      <View style={styles.list}>
        {groups.map((group) => (
          <View key={group.dayKey} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <View style={[styles.dayDot, { backgroundColor: palette.primary }]} />
              <View style={styles.dayCopy}>
                <Text style={[styles.dayLabel, { color: palette.text }]}>{group.relativeLabel}</Text>
                <Text style={[styles.dayMeta, { color: palette.textSecondary }]}>
                  {group.dayLabel} · {group.events.length} event{group.events.length === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            <View style={[styles.eventsCol, { borderColor: palette.border }]}>
              {group.events.map((event, index) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventRow,
                    index < group.events.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: palette.border,
                    },
                  ]}
                  onPress={() => onPressEvent(event.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.eventCopy}>
                    <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={[styles.eventMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                      {event.time} · {event.venue}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={palette.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  list: {
    gap: 12,
  },
  dayBlock: {
    gap: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayCopy: {
    flex: 1,
    gap: 1,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  dayMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventsCol: {
    marginLeft: 18,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eventCopy: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
});
