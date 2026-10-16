import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, CircleHelp, Ticket } from 'lucide-react-native';
import type { TicketStatus } from '@/utils/personalEventAttendance';
import type { EventsPalette } from '@/utils/eventsPalette';

interface Props {
  value: TicketStatus;
  palette: EventsPalette;
  busy?: boolean;
  onChange: (value: TicketStatus) => void | Promise<void>;
  onFindTickets?: () => void;
}

export function EventTicketStatus({ value, palette, busy, onChange, onFindTickets }: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}>
      <View style={styles.top}>
        <Ticket size={17} color={palette.primary} />
        <Text style={[styles.heading, { color: palette.text }]}>Your ticket</Text>
      </View>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        An RSVP never means you've bought a ticket. Keep track of this separately.
      </Text>
      <View style={styles.options}>
        {([
          ['need', 'Need ticket', CircleHelp],
          ['secured', 'Ticket secured', CheckCircle2],
          ['not_needed', 'Not required', CheckCircle2],
        ] as const).map(([status, title, Icon]) => (
          <TouchableOpacity
            key={status}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ selected: value === status, disabled: !!busy }}
            style={[styles.option, {
              backgroundColor: value === status ? palette.primaryLight : palette.card,
              borderColor: value === status ? palette.primary : palette.border,
            }]}
            onPress={() => void onChange(status)}
          >
            <Icon size={13} color={value === status ? palette.primary : palette.textSecondary} />
            <Text style={[styles.optionText, { color: value === status ? palette.primary : palette.textSecondary }]}>
              {title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {value === 'need' && onFindTickets ? (
        <TouchableOpacity style={styles.link} onPress={onFindTickets}>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>Find official tickets →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 15, fontWeight: '800' },
  subtitle: { fontSize: 12, lineHeight: 18 },
  options: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  option: { flexGrow: 1, minHeight: 41, borderRadius: 10, borderWidth: 1, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  optionText: { fontSize: 11, fontWeight: '700' },
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
});
