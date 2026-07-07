import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';

interface EventsMapMarkerProps {
  category: string;
  selected?: boolean;
}

export const EventsMapMarker = React.memo(function EventsMapMarker({
  category,
  selected = false,
}: EventsMapMarkerProps) {
  const meta = getEventCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <View style={[styles.wrap, selected && styles.wrapSelected]}>
      <View style={[styles.pin, { backgroundColor: meta.color, borderColor: selected ? '#FFF' : meta.color }]}>
        <Icon size={11} color="#FFF" strokeWidth={2.4} />
      </View>
      <View style={[styles.stem, { backgroundColor: meta.color }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wrapSelected: {
    transform: [{ scale: 1.12 }],
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stem: {
    width: 3,
    height: 8,
    borderRadius: 2,
    marginTop: -1,
  },
});
