import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EventConciergeNarrative as ConciergeCopy } from '@/utils/eventConcierge';
import type { EventsPalette } from '@/utils/eventsPalette';

interface EventConciergeNarrativeProps {
  narrative: ConciergeCopy | null | undefined;
  palette?: EventsPalette;
}

export const EventConciergeNarrative = React.memo(function EventConciergeNarrative({
  narrative,
  palette,
}: EventConciergeNarrativeProps) {
  if (!narrative) return null;

  const titleColor = palette?.textOnImage ?? '#FFF';
  const summaryColor = palette?.textOnImageSecondary ?? 'rgba(255,255,255,0.82)';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.greeting, { color: titleColor }]}>{narrative.greeting}</Text>
      <Text style={[styles.summary, { color: summaryColor }]}>{narrative.summarySentence}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    gap: 4,
  },
  greeting: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
});
