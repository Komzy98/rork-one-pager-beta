import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { LocalEvent } from '@/types/events';
import type { EventsPalette } from '@/utils/eventsPalette';
import { isAffordableEvent, isWeekendEvent } from '@/utils/eventsV2Discovery';

type Day = 'any' | 'friday' | 'saturday' | 'sunday';
type Mood = 'any' | 'social' | 'relaxed';
type Budget = 'any' | '20' | '50' | '100';

interface Props {
  visible: boolean;
  events: LocalEvent[];
  palette: EventsPalette;
  onClose: () => void;
  onSave: (event: LocalEvent) => void | Promise<void>;
  isSaved: (id: string) => boolean;
}

const choices = <T extends string>(value: T, options: ReadonlyArray<{ value: T; label: string }>,
  onChange: (v: T) => void, palette: EventsPalette) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 16 }}>
      {options.map(option => {
        const selected = option.value === value;
        return <TouchableOpacity key={option.value} accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => onChange(option.value)}
          style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16,
            borderWidth: 1, borderColor: selected ? palette.primary : palette.border,
            backgroundColor: selected ? palette.primaryLight : palette.card }}>
          <Text style={{ color: selected ? palette.primary : palette.text, fontWeight: '600' }}>{option.label}</Text>
        </TouchableOpacity>;
      })}
    </View>
  );

export function EventsWeekendPlanner({ visible, events, palette, onClose, onSave, isSaved }: Props) {
  const [day, setDay] = useState<Day>('any');
  const [mood, setMood] = useState<Mood>('any');
  const [budget, setBudget] = useState<Budget>('any');
  const suggested = useMemo(() => events.filter(event => {
    if (!isWeekendEvent(event)) return false;
    if (day !== 'any' && event.startIso) {
      const weekday = new Date(event.startIso).getDay();
      if (weekday !== ({ friday: 5, saturday: 6, sunday: 0 } as const)[day]) return false;
    }
    if (budget !== 'any' && !isAffordableEvent(event, Number(budget))) return false;
    if (mood === 'social' && !['comedy', 'music', 'nightlife', 'networking'].includes(event.category)) return false;
    if (mood === 'relaxed' && !['arts', 'theatre', 'food', 'fitness'].includes(event.category)) return false;
    return true;
  }).slice(0, 10), [events, day, budget, mood]);

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.60)' }}>
      <View style={{ maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        backgroundColor: palette.card, paddingTop: 20 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: palette.primary, fontWeight: '700' }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: '800', color: palette.text }}>Plan your weekend</Text>
          <Text style={{ color: palette.textSecondary, marginTop: 5, marginBottom: 20 }}>
            Real event listings that match your choices. Saving is not a ticket booking or an attendance confirmation.
          </Text>
          <Text style={{ fontWeight: '700', color: palette.text }}>Which day?</Text>
          {choices(day, [{value:'any',label:'Any'},{value:'friday',label:'Fri'},
            {value:'saturday',label:'Sat'},{value:'sunday',label:'Sun'}], setDay, palette)}
          <Text style={{ fontWeight: '700', color: palette.text }}>Budget per event</Text>
          {choices(budget, [{value:'any',label:'Any'},{value:'20',label:'£20'},
            {value:'50',label:'£50'},{value:'100',label:'£100'}], setBudget, palette)}
          <Text style={{ fontWeight: '700', color: palette.text }}>Your mood</Text>
          {choices(mood, [{value:'any',label:'Surprise me'},{value:'social',label:'Social'},
            {value:'relaxed',label:'Relaxed'}], setMood, palette)}
          <Text style={{ fontWeight: '800', fontSize: 18, color: palette.text, marginBottom: 12 }}>
            {suggested.length} matching event{suggested.length === 1 ? '' : 's'}
          </Text>
          {suggested.length === 0 ? <Text style={{ color: palette.textSecondary }}>
            No verified weekend listings match these filters. Try another day, mood or budget.
          </Text> : suggested.map(event => <View key={event.id} style={{ padding: 14, borderWidth: 1,
            borderColor: palette.border, borderRadius: 16, marginBottom: 10 }}>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>{event.title}</Text>
            <Text style={{ color: palette.textSecondary, marginTop: 5 }}>
              {event.date} · {event.time} · {event.venue}
            </Text>
            <Text style={{ color: palette.textSecondary, marginTop: 3 }}>
              {event.price || 'Price not provided'} · {event.location}
            </Text>
            <TouchableOpacity disabled={isSaved(event.id)} onPress={() => void onSave(event)}
              style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: palette.primary,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>
                {isSaved(event.id) ? 'Saved' : 'Save this event'}
              </Text>
            </TouchableOpacity>
          </View>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
