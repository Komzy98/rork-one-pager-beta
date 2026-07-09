import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, HelpCircle, UserPlus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { PlanRsvpStatus, SavedEventSocialSummary } from '@/utils/sharedPlansService';
import type { EventsPalette } from '@/utils/eventsPalette';

const RSVP_OPTIONS: {
  status: PlanRsvpStatus;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { status: 'in', label: "I'm in", icon: Check },
  { status: 'maybe', label: 'Maybe', icon: HelpCircle },
  { status: 'cant', label: "Can't", icon: X },
];

function formatMyStatus(status: PlanRsvpStatus | null): string {
  if (status === 'in') return "You're in";
  if (status === 'maybe') return 'Maybe';
  if (status === 'cant') return "Can't go";
  return 'RSVP?';
}

interface SavedEventSocialRowProps {
  summary: SavedEventSocialSummary;
  palette: EventsPalette;
  canRsvp?: boolean;
  rsvpLoading?: boolean;
  pendingStatus?: PlanRsvpStatus | null;
  onRsvp?: (status: PlanRsvpStatus) => void | Promise<void>;
  onInviteFriends?: () => void;
}

export const SavedEventSocialRow = React.memo(function SavedEventSocialRow({
  summary,
  palette,
  canRsvp = false,
  rsvpLoading = false,
  pendingStatus = null,
  onRsvp,
  onInviteFriends,
}: SavedEventSocialRowProps) {
  const handleRsvp = useCallback(
    (status: PlanRsvpStatus) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void onRsvp?.(status);
    },
    [onRsvp],
  );

  const groupLabel =
    summary.goingCount > 0
      ? `${summary.goingCount} in${summary.maybeCount > 0 ? ` · ${summary.maybeCount} maybe` : ''}`
      : summary.friendsSavedCount > 0
        ? `${summary.friendsSavedCount} friend${summary.friendsSavedCount === 1 ? '' : 's'} saved`
        : null;

  const namesLabel =
    summary.goingNames.length > 0 ? summary.goingNames.join(', ') : null;

  if (!canRsvp && !summary.hasGroupActivity && !onInviteFriends) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}>
      <View style={styles.header}>
        <View style={[styles.statusPill, { backgroundColor: palette.primaryLight }]}>
          <Text style={[styles.statusText, { color: palette.primary }]}>
            {formatMyStatus(summary.myStatus)}
          </Text>
        </View>
        {groupLabel ? (
          <Text style={[styles.meta, { color: palette.textSecondary }]}>{groupLabel}</Text>
        ) : null}
      </View>

      {namesLabel ? (
        <Text style={[styles.names, { color: palette.textSecondary }]} numberOfLines={1}>
          {namesLabel}
        </Text>
      ) : null}

      {canRsvp && onRsvp ? (
        <View style={styles.rsvpRow}>
          {RSVP_OPTIONS.map(({ status, label, icon: Icon }) => {
            const active = summary.myStatus === status;
            const pending = pendingStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? palette.primary : palette.border,
                    backgroundColor: active ? palette.primaryLight : palette.card,
                  },
                ]}
                onPress={() => handleRsvp(status)}
                disabled={rsvpLoading && !pending}
                activeOpacity={0.85}
              >
                {pending ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <Icon size={12} color={active ? palette.primary : palette.textSecondary} />
                )}
                <Text style={[styles.chipText, { color: active ? palette.primary : palette.textSecondary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {onInviteFriends ? (
        <TouchableOpacity
          style={[styles.inviteBtn, { borderColor: palette.border }]}
          onPress={onInviteFriends}
          activeOpacity={0.85}
        >
          <UserPlus size={13} color={palette.primary} />
          <Text style={[styles.inviteText, { color: palette.primary }]}>
            {summary.hasGroupActivity ? 'Invite more friends' : 'Invite friends'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  names: {
    fontSize: 11,
    fontWeight: '500',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 36,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  inviteText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
