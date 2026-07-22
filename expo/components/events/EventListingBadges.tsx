import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LocalEvent } from '@/types/events';
import type { EventsPalette } from '@/utils/eventsPalette';
import { getEventListingBadges } from '@/utils/eventListingMeta';

type Props = {
  event: LocalEvent;
  palette: EventsPalette;
};

export default function EventListingBadges({ event, palette }: Props) {
  const { sourceLabel, marketBadge } = getEventListingBadges(event);
  if (!sourceLabel && !marketBadge) return null;

  return (
    <View style={styles.row}>
      {sourceLabel ? (
        <View style={[styles.pill, { backgroundColor: palette.primaryLight, borderColor: `${palette.primary}33` }]}>
          <Text style={[styles.sourceText, { color: palette.primary }]} numberOfLines={1}>
            {sourceLabel}
          </Text>
        </View>
      ) : null}
      {marketBadge ? (
        <View style={[styles.pill, styles.marketPill, { borderColor: palette.border }]}>
          <Text style={[styles.marketText, { color: palette.textSecondary }]}>{marketBadge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  marketPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  marketText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
