import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { LocalEvent } from '@/types/events';
import {
  getOverviewFitChipLabel,
  getPrimaryEventRecommendationReason,
  type EventRecommendationInput,
} from '@/utils/eventPersonalization';
import { formatEventOverviewWhen } from '@/utils/eventDiscovery';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';

interface ThemeColors {
  text: string;
  textSecondary: string;
  textMuted: string;
  card: string;
  border: string;
  primary: string;
  primaryLight: string;
}

interface OnePagerSavedFitSectionProps {
  events: LocalEvent[];
  recommendationInput: EventRecommendationInput;
  colors: ThemeColors;
  maxItems?: number;
  timeFormat?: '12h' | '24h';
}

export function OnePagerSavedFitSection({
  events,
  recommendationInput,
  colors,
  maxItems = 3,
  timeFormat = '12h',
}: OnePagerSavedFitSectionProps) {
  const visibleEvents = useMemo(() => events.slice(0, maxItems), [events, maxItems]);
  if (visibleEvents.length === 0) return null;

  const handleOpen = useCallback((eventId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(root)/event/${eventId}` as never);
  }, []);

  const handleViewAll = useCallback(() => {
    router.push('/(tabs)/events' as never);
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Sparkles size={18} color={colors.primary} />
          <View style={styles.headerTextBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>On your One Pager</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Saved plans & picks that fit you
            </Text>
          </View>
        </View>
        {events.length > maxItems ? (
          <TouchableOpacity onPress={handleViewAll} style={styles.viewAllBtn}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.list}>
        {visibleEvents.map((event) => {
          const reason = getPrimaryEventRecommendationReason(event, recommendationInput);
          const chipLabel = getOverviewFitChipLabel(reason, event);
          const whenLabel = formatEventOverviewWhen(event, timeFormat);
          const categoryMeta = getEventCategoryMeta(event.category);
          const CategoryIcon = categoryMeta.icon;

          return (
            <TouchableOpacity
              key={event.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleOpen(event.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${categoryMeta.color}18` }]}>
                <CategoryIcon size={16} color={categoryMeta.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {event.venue} · {whenLabel}
                </Text>
                <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>{chipLabel}</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
