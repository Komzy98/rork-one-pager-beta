import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CalendarPlus, CheckCircle2, ChevronRight, Ticket, UserPlus, X } from 'lucide-react-native';
import type { EventsPalette } from '@/utils/eventsPalette';

type Followup = {
  key: 'tickets' | 'calendar' | 'remind' | 'invite';
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  action: () => void;
};

interface Props {
  visible: boolean;
  title: string;
  scheduleLabel?: string | null;
  venueLabel?: string | null;
  palette: EventsPalette;
  ticketsAvailable: boolean;
  onClose: () => void;
  onTickets: () => void;
  onCalendar: () => void;
  onRemind: () => void;
  onInvite: () => void;
}

export function EventRsvpConfirmationSheet({
  visible, title, scheduleLabel, venueLabel, palette,
  ticketsAvailable, onClose, onTickets, onCalendar, onRemind, onInvite,
}: Props) {
  const insets = useSafeAreaInsets();
  const actions: Followup[] = [
    ...(ticketsAvailable ? [{
      key: 'tickets' as const,
      label: 'View tickets',
      description: 'Open the event provider — RSVP does not reserve a ticket',
      icon: Ticket, action: onTickets,
    }] : []),
    { key: 'calendar', label: 'Add to calendar', description: 'Save the event date and venue', icon: CalendarPlus, action: onCalendar },
    { key: 'remind', label: 'Set a reminder', description: 'Get a notification before the event', icon: Bell, action: onRemind },
    { key: 'invite', label: 'Invite friends', description: 'Start a separate plan with your people', icon: UserPlus, action: onInvite },
  ];
  const run = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close RSVP confirmation" />
        <View style={[styles.sheet, { backgroundColor: palette.background, paddingBottom: Math.max(16, insets.bottom) + 8 }]}>
          <View style={styles.top}>
            <View style={[styles.success, { backgroundColor: palette.primaryLight }]}>
              <CheckCircle2 size={28} color={palette.primary} />
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: palette.surfaceLight }]} accessibilityLabel="Close">
              <X size={19} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.heading, { color: palette.text }]}>You're planning to go!</Text>
          <Text style={[styles.name, { color: palette.text }]} numberOfLines={2}>{title}</Text>
          {scheduleLabel || venueLabel ? (
            <Text style={[styles.description, { color: palette.textSecondary }]} numberOfLines={2}>
              {[scheduleLabel, venueLabel].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <Text style={[styles.note, { color: palette.textSecondary }]}>
            Your RSVP is saved privately. Tickets are separate — confirm yours with the event provider.
          </Text>
          <Text style={[styles.sectionHeading, { color: palette.text }]}>Make it happen</Text>
          {actions.map(({ key, label, description, icon: Icon, action }) => (
            <TouchableOpacity
              key={key}
              style={[styles.action, { borderColor: palette.border, backgroundColor: palette.card }]}
              onPress={() => run(action)}
              activeOpacity={0.84}
            >
              <View style={[styles.actionIcon, { backgroundColor: palette.primaryLight }]}>
                <Icon size={18} color={palette.primary} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={[styles.actionTitle, { color: palette.text }]}>{label}</Text>
                <Text style={[styles.actionSub, { color: palette.textSecondary }]} numberOfLines={2}>{description}</Text>
              </View>
              <ChevronRight size={17} color={palette.textSecondary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={styles.done} accessibilityRole="button">
            <Text style={{ color: palette.primary, fontSize: 14, fontWeight: '800' }}>Done for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,11,24,0.62)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 18, paddingHorizontal: 22, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 },
  success: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  name: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  description: { fontSize: 12, lineHeight: 18 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 3, marginBottom: 6 },
  sectionHeading: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  action: { minHeight: 58, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  actionIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 13, fontWeight: '800' },
  actionSub: { fontSize: 11, lineHeight: 15 },
  done: { alignItems: 'center', minHeight: 42, justifyContent: 'center' },
});
