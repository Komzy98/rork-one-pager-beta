import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, HelpCircle, UserPlus, X, Ticket, CalendarPlus, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { PlanRsvpStatus } from '@/utils/sharedPlansService';
import type { EventsPalette } from '@/utils/eventsPalette';

const OPTIONS: { status: PlanRsvpStatus; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { status: 'in', label: 'Going', icon: Check },
  { status: 'maybe', label: 'Maybe', icon: HelpCircle },
  { status: 'cant', label: 'Not going', icon: X },
];

interface EventPlanRsvpProps {
  palette: EventsPalette;
  myStatus: PlanRsvpStatus | null;
  goingCount: number;
  maybeCount: number;
  loading?: boolean;
  pendingStatus?: PlanRsvpStatus | null;
  onSelect: (status: PlanRsvpStatus) => void | Promise<void>;
  onInviteFriends?: () => void;
  onTickets?: () => void;
  onCalendar?: () => void;
  onRemind?: () => void;
  ticketAvailable?: boolean;
  canRsvp?: boolean;
}

export const EventPlanRsvp = React.memo(function EventPlanRsvp({
  palette,
  myStatus,
  goingCount,
  maybeCount,
  loading = false,
  pendingStatus = null,
  onSelect,
  onInviteFriends,
  onTickets,
  onCalendar,
  onRemind,
  ticketAvailable = false,
  canRsvp = true,
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
        <Text style={[styles.title, { color: palette.text }]}>Your plans</Text>
        {goingCount > 0 || maybeCount > 0 ? (
          <Text style={[styles.meta, { color: palette.textSecondary }]}>
            {goingCount > 0 ? `${goingCount} going` : ''}{maybeCount > 0 ? ` · ${maybeCount} maybe` : ''}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.hint, { color: palette.textSecondary }]}>
        {myStatus === 'in' ? 'You’re planning to go. A response isn’t a ticket.' :
         myStatus === 'maybe' ? 'Saved as a possibility — change your mind anytime.' :
         myStatus === 'cant' ? 'Not going — you can change this later.' :
         canRsvp ? 'Let One Pager know your plans. Only you can see this response.' : 'Sign in to save your attendance privately.'}
      </Text>
      <View style={styles.row}>
        {OPTIONS.map(({ status, label, icon: Icon }) => {
          const active = myStatus === status;
          const isPending = pendingStatus === status;
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
              disabled={loading || !canRsvp}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: loading || !canRsvp }}
              activeOpacity={0.85}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              {isPending ? (
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
      {myStatus === 'in' ? (
        <View style={styles.followUps}>
          {ticketAvailable && onTickets ? (
            <TouchableOpacity style={[styles.nextAction, { borderColor: palette.border }]} onPress={onTickets}>
              <Ticket size={14} color={palette.primary} />
              <Text style={[styles.nextActionText, { color: palette.text }]}>Tickets</Text>
            </TouchableOpacity>
          ) : null}
          {onCalendar ? (
            <TouchableOpacity style={[styles.nextAction, { borderColor: palette.border }]} onPress={onCalendar}>
              <CalendarPlus size={14} color={palette.primary} />
              <Text style={[styles.nextActionText, { color: palette.text }]}>Calendar</Text>
            </TouchableOpacity>
          ) : null}
          {onRemind ? (
            <TouchableOpacity style={[styles.nextAction, { borderColor: palette.border }]} onPress={onRemind}>
              <Bell size={14} color={palette.primary} />
              <Text style={[styles.nextActionText, { color: palette.text }]}>Remind me</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {onInviteFriends ? (
        <TouchableOpacity
          style={[styles.inviteRow, { borderColor: palette.border, backgroundColor: palette.surfaceLight }]}
          onPress={onInviteFriends}
          activeOpacity={0.85}
        >
          <UserPlus size={15} color={palette.primary} />
          <Text style={[styles.inviteText, { color: palette.primary }]}>Invite friends to go with you</Text>
        </TouchableOpacity>
      ) : null}
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
  hint: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  followUps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nextAction: { flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 10, gap: 6, minHeight: 40, paddingHorizontal: 8 },
  nextActionText: { fontSize: 12, fontWeight: '700' },
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
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
