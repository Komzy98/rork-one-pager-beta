import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { FriendEventSave, GuestRsvp, PlanRsvp } from '@/utils/sharedPlansService';
import type { EventsPalette } from '@/utils/eventsPalette';

interface WhoIsGoingProps {
  palette: EventsPalette;
  rsvpsGoing: PlanRsvp[];
  guestRsvps?: GuestRsvp[];
  friendsSaved: FriendEventSave[];
}

function displayName(profile?: { displayName: string | null; username: string } | null): string {
  if (!profile) return 'Partner';
  return profile.displayName ?? `@${profile.username}`;
}

export const WhoIsGoing = React.memo(function WhoIsGoing({
  palette,
  rsvpsGoing,
  guestRsvps = [],
  friendsSaved,
}: WhoIsGoingProps) {
  const rsvpIds = new Set(rsvpsGoing.map((r) => r.userId));
  const savedOnly = friendsSaved.filter((f) => !rsvpIds.has(f.userId));

  const chips = [
    ...rsvpsGoing.map((r) => ({
      key: `rsvp-${r.userId}`,
      name: displayName(r.profile),
      avatarUrl: r.profile?.avatarUrl ?? null,
      tag: 'In',
    })),
    ...guestRsvps
      .filter((g) => g.status === 'in' || g.status === 'maybe')
      .map((g) => ({
        key: `guest-${g.id}`,
        name: g.displayName,
        avatarUrl: null as string | null,
        tag: g.status === 'in' ? 'In' : 'Maybe',
      })),
    ...savedOnly.map((f) => ({
      key: `save-${f.userId}`,
      name: displayName(f.profile),
      avatarUrl: f.profile?.avatarUrl ?? null,
      tag: 'Saved',
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>Who&apos;s going</Text>
      <View style={styles.row}>
        {chips.slice(0, 6).map((chip) => (
          <View key={chip.key} style={styles.person}>
            {chip.avatarUrl ? (
              <Image source={{ uri: chip.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: palette.primaryLight }]}>
                <Text style={[styles.avatarInitial, { color: palette.primary }]}>
                  {chip.name.replace('@', '').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
              {chip.name}
            </Text>
            <Text style={[styles.tag, { color: palette.textMuted }]}>{chip.tag}</Text>
          </View>
        ))}
      </View>
      {chips.length > 6 ? (
        <Text style={[styles.more, { color: palette.textMuted }]}>+{chips.length - 6} more</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  person: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  tag: {
    fontSize: 10,
    fontWeight: '600',
  },
  more: {
    fontSize: 11,
    fontWeight: '600',
  },
});
