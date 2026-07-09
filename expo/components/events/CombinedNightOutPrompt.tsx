import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { LocalEvent } from '@/types/events';
import { buildCombinedNightOutPlan } from '@/utils/savedEventsWeek';
import type { EventsPalette } from '@/utils/eventsPalette';
import { EventNightOutPlanner } from '@/components/events/EventNightOutPlanner';

interface CombinedNightOutPromptProps {
  dayLabel: string;
  events: LocalEvent[];
  palette: EventsPalette;
  areaLabel?: string;
  expanded: boolean;
  onToggle: () => void;
  onDismiss?: () => void;
}

export const CombinedNightOutPrompt = React.memo(function CombinedNightOutPrompt({
  dayLabel,
  events,
  palette,
  areaLabel,
  expanded,
  onToggle,
  onDismiss,
}: CombinedNightOutPromptProps) {
  const steps = useMemo(
    () => (expanded ? buildCombinedNightOutPlan(events, areaLabel) : []),
    [expanded, events, areaLabel],
  );

  const eventCount = events.length;
  const titles = events.map((event) => event.title).slice(0, 2).join(' + ');

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: palette.primaryLight }]}>
          <Sparkles size={16} color={palette.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text }]}>
            You have {eventCount} events {dayLabel}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]} numberOfLines={2}>
            Want a combined night out? We&apos;ll line up {titles}
            {eventCount > 2 ? ` + ${eventCount - 2} more` : ''}.
          </Text>
        </View>
        {onDismiss ? (
          <TouchableOpacity onPress={onDismiss} hitSlop={8}>
            <X size={16} color={palette.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.cta, { backgroundColor: palette.primary }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onToggle();
        }}
        activeOpacity={0.9}
      >
        <Text style={styles.ctaText}>
          {expanded ? 'Hide combined plan' : 'Build combined night out'}
        </Text>
      </TouchableOpacity>

      {expanded && steps.length > 0 ? (
        <EventNightOutPlanner steps={steps} palette={palette} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
