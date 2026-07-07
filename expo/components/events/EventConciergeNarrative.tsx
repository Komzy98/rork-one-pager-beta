import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EventConciergeNarrative as ConciergeCopy } from '@/utils/eventConcierge';

interface EventConciergeNarrativeProps {
  narrative: ConciergeCopy | null | undefined;
}

export const EventConciergeNarrative = React.memo(function EventConciergeNarrative({
  narrative,
}: EventConciergeNarrativeProps) {
  if (!narrative) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.greeting}>{narrative.greeting}</Text>
      <Text style={styles.summary}>{narrative.summarySentence}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    gap: 4,
  },
  greeting: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summary: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
});
