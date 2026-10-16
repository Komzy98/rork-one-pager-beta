import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, Calendar, MapPin, Navigation, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { LocalEvent, EventPlanningStatus } from '@/types/events';
import { getEventCountdownLabel } from '@/utils/eventDiscovery';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';
import type { EventsPalette } from '@/utils/eventsPalette';
import { SavedEventSocialRow } from '@/components/events/SavedEventSocialRow';
import type { PlanRsvpStatus, SavedEventSocialSummary } from '@/utils/sharedPlansService';

interface PremiumSavedEventCardProps {
  event: LocalEvent;
  palette: EventsPalette;
  areaLabel?: string;
  socialSummary?: SavedEventSocialSummary;
  canRsvp?: boolean;
  rsvpLoading?: boolean;
  pendingRsvpStatus?: PlanRsvpStatus | null;
  onPress: (eventId: string) => void;
  onAddToOnePager: (event: LocalEvent) => void;
  onRemind: (event: LocalEvent) => void;
  onAddToCalendar: (event: LocalEvent) => void;
  onDirections: (event: LocalEvent) => void;
  onRsvp?: (event: LocalEvent, status: PlanRsvpStatus) => void | Promise<void>;
  onInviteFriends?: (event: LocalEvent) => void;
  planningStatus?: EventPlanningStatus;
  onPlanningStatusChange?: (eventId: string, status: EventPlanningStatus) => void;
}

export const PremiumSavedEventCard = React.memo(function PremiumSavedEventCard({
  event,
  palette,
  areaLabel,
  socialSummary,
  canRsvp = false,
  rsvpLoading = false,
  pendingRsvpStatus = null,
  onPress,
  onAddToOnePager,
  onRemind,
  onAddToCalendar,
  onDirections,
  onRsvp,
  onInviteFriends,
  planningStatus = 'interested',
  onPlanningStatusChange,
}: PremiumSavedEventCardProps) {
  const categoryMeta = getEventCategoryMeta(event.category);
  const CategoryIcon = categoryMeta.icon;
  const countdown = getEventCountdownLabel(event);

  const handleOpen = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(event.id);
  }, [event.id, onPress]);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
      onPress={handleOpen}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${categoryMeta.color}18` }]}>
          <CategoryIcon size={18} color={categoryMeta.color} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={11} color={palette.textMuted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]} numberOfLines={1}>
              {event.venue} · {event.date}
            </Text>
          </View>
        </View>
        <View style={[styles.countdownBadge, { backgroundColor: palette.primaryLight }]}>
          <Text style={[styles.countdownText, { color: palette.primary }]}>{countdown}</Text>
        </View>
      </View>

      {socialSummary ? (
        <View onStartShouldSetResponder={() => true}>
          <SavedEventSocialRow
            summary={socialSummary}
            palette={palette}
            canRsvp={canRsvp}
            rsvpLoading={rsvpLoading}
            pendingStatus={pendingRsvpStatus}
            onRsvp={onRsvp ? (status) => onRsvp(event, status) : undefined}
            onInviteFriends={onInviteFriends ? () => onInviteFriends(event) : undefined}
          />
        </View>
      ) : null}

      {onPlanningStatusChange ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 }}>
          {(['interested', 'planning', 'going'] as const).map(status => (
            <TouchableOpacity
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: planningStatus === status }}
              onPress={(e) => { e.stopPropagation(); onPlanningStatusChange(event.id, status); }}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1,
                borderColor: planningStatus === status ? palette.primary : palette.border,
                backgroundColor: planningStatus === status ? palette.primaryLight : palette.card }}
            >
              <Text style={{ color: planningStatus === status ? palette.primary : palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                {status === 'interested' ? 'Interested' : status === 'planning' ? 'Planning' : 'Going'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleOpen}
        style={{ marginTop: 8, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 11, backgroundColor: palette.primaryLight }}
      >
        <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>Plan travel, reminders and meetup →</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            void onAddToOnePager(event);
          }}
        >
          <Sparkles size={14} color="#FFF" />
          <Text style={styles.primaryBtnText}>In One Pager</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: palette.border }]}
          onPress={(e) => {
            e.stopPropagation();
            void onRemind(event);
          }}
        >
          <Bell size={14} color={palette.textSecondary} />
          <Text style={[styles.actionBtnText, { color: palette.textSecondary }]}>Remind</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: palette.border }]}
          onPress={(e) => {
            e.stopPropagation();
            void onAddToCalendar(event);
          }}
        >
          <Calendar size={14} color={palette.textSecondary} />
          <Text style={[styles.actionBtnText, { color: palette.textSecondary }]}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconOnlyBtn, { borderColor: palette.border }]}
          onPress={(e) => {
            e.stopPropagation();
            void onDirections(event);
          }}
        >
          <Navigation size={14} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconOnlyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
