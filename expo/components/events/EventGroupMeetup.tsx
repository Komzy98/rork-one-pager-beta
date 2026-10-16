import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock3, UserPlus, Users } from 'lucide-react-native';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import type { LocalEvent } from '@/types/events';
import type { SharedPlan } from '@/utils/sharedPlansService';
import type { EventsPalette } from '@/utils/eventsPalette';

interface Props {
  event: LocalEvent;
  palette: EventsPalette;
  plan: SharedPlan | null;
  isOrganiser: boolean;
  attendeeCount: number;
  onInvite: () => void;
  onSetMeetAt: (when: Date | null) => Promise<void>;
}
const EARLY_OPTIONS = [15, 30, 45, 60] as const;

export function EventGroupMeetup({
  event, palette, plan, isOrganiser, attendeeCount, onInvite, onSetMeetAt,
}: Props) {
  const [busy, setBusy] = useState(false);
  const eventStart = parseEventStartDateTime(event);
  const meetAt = plan?.meetAt ? new Date(plan.meetAt) : null;
  const hasMeetTime = meetAt && Number.isFinite(meetAt.getTime());
  const select = async (minutes: number) => {
    if (!eventStart || !isOrganiser) return;
    setBusy(true);
    try {
      const proposed = new Date(eventStart.getTime() - minutes * 60_000);
      if (proposed <= new Date()) {
        Alert.alert('Meeting time', 'That time has already passed. Please agree a time directly with friends.');
        return;
      }
      await onSetMeetAt(proposed);
    } catch (e) {
      Alert.alert('Could not update group plan', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.top}>
        <Users size={18} color={palette.primary} />
        <Text style={[styles.heading, { color: palette.text }]}>Going with friends?</Text>
      </View>
      <Text style={[styles.sub, { color: palette.textSecondary }]}>
        {plan
          ? attendeeCount > 0 ? `Your group · ${attendeeCount} attending` : 'Your group · Waiting for RSVPs'
          : 'Start a private plan for this event. Other groups stay separate.'}
      </Text>
      {hasMeetTime && (
        <View style={[styles.meetTime, { backgroundColor: palette.primaryLight }]}>
          <Clock3 size={16} color={palette.primary} />
          <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 13 }}>
            Meet at {meetAt!.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
      {plan && isOrganiser && eventStart && (
        <>
          <Text style={[styles.caption, { color: palette.textSecondary }]}>
            Suggest a meeting time before the advertised event start:
          </Text>
          <View style={styles.times}>
            {EARLY_OPTIONS.map((minutes) => (
              <TouchableOpacity
                key={minutes}
                disabled={busy}
                onPress={() => void select(minutes)}
                style={[styles.timeChip, { borderColor: palette.border }]}
                accessibilityLabel={`Meet ${minutes} minutes before the event`}
              >
                <Text style={{ color: palette.text, fontSize: 12, fontWeight: '700' }}>{minutes}m before</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      {hasMeetTime && isOrganiser ? (
        <TouchableOpacity
          style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
          disabled={busy}
          onPress={() => void onSetMeetAt(null).catch((error) => {
            Alert.alert('Meeting time', error instanceof Error ? error.message : 'Could not clear this time.');
          })}
        >
          <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700' }}>Clear meeting time</Text>
        </TouchableOpacity>
      ) : null}
      {busy ? <ActivityIndicator color={palette.primary} /> : null}
      <TouchableOpacity
        style={[styles.invite, { borderColor: palette.primary }]}
        onPress={onInvite}
        accessibilityRole="button"
      >
        <UserPlus size={15} color={palette.primary} />
        <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 13 }}>Invite friends</Text>
      </TouchableOpacity>
      <Text style={[styles.caption, { color: palette.textSecondary }]}>
        Times are suggestions for your group, not confirmed venue opening times.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 18 },
  meetTime: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10 },
  caption: { fontSize: 11, lineHeight: 16 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: { minHeight: 35, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  invite: { minHeight: 44, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
