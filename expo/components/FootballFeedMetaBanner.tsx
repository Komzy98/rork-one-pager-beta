import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock, Database } from 'lucide-react-native';
import { formatFootballFeedUpdatedLabel } from '@/utils/footballMatchReasons';

type Props = {
  textColor: string;
  mutedColor: string;
  backgroundColor: string;
  borderColor: string;
  updatedAtMs?: number;
  sortMode: 'kickoff' | 'competition' | 'smart';
  pollLive: boolean;
};

export default function FootballFeedMetaBanner({
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  updatedAtMs,
  sortMode,
  pollLive,
}: Props) {
  const sortHint =
    sortMode === 'smart'
      ? 'Your teams & leagues first'
      : sortMode === 'competition'
        ? 'Grouped by competition'
        : 'Sorted by kickoff';

  const refreshHint = pollLive
    ? 'Live scores refresh about every 60s on this tab'
    : 'Pull down to refresh fixtures';

  return (
    <View style={[styles.wrap, { backgroundColor, borderColor }]}>
      <View style={styles.row}>
        <Database size={13} color={mutedColor} />
        <Text style={[styles.primary, { color: textColor }]}>
          Fixtures from API-Football · {sortHint}
        </Text>
      </View>
      <View style={styles.row}>
        <Clock size={12} color={mutedColor} />
        <Text style={[styles.secondary, { color: mutedColor }]}>
          {formatFootballFeedUpdatedLabel(updatedAtMs)} · {refreshHint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primary: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  secondary: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
});
