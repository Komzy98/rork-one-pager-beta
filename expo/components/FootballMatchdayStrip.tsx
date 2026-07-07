import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import type { MatchdayEntry } from '@/utils/footballMatchday';

type Props = {
  entries: MatchdayEntry[];
  accentColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  borderColor: string;
  onMatchPress?: (matchId: string) => void;
};

export const FootballMatchdayStrip = React.memo(function FootballMatchdayStrip({
  entries,
  accentColor,
  textColor,
  mutedColor,
  surfaceColor,
  borderColor,
  onMatchPress,
}: Props) {
  if (entries.length === 0) return null;

  const label =
    entries.length === 1
      ? '1 of your teams plays today'
      : `${entries.length} of your teams play today`;

  return (
    <View
      style={[styles.shell, { backgroundColor: surfaceColor, borderColor }]}
      accessibilityRole="summary"
      accessibilityLabel={label}
    >
      <Text style={[styles.label, { color: accentColor }]} numberOfLines={1}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {entries.map((entry) => (
          <TouchableOpacity
            key={`${entry.matchId}-${entry.teamName}`}
            style={[styles.chip, { borderColor }]}
            activeOpacity={0.85}
            onPress={() => onMatchPress?.(entry.matchId)}
            accessibilityRole="button"
            accessibilityLabel={`${entry.teamName} vs ${entry.opponent}, ${entry.time}`}
          >
            {entry.logoUri ? (
              <Image source={{ uri: entry.logoUri }} style={styles.crest} resizeMode="contain" />
            ) : (
              <View style={[styles.crestPlaceholder, { backgroundColor: borderColor }]} />
            )}
            <View style={styles.chipText}>
              <Text style={[styles.team, { color: textColor }]} numberOfLines={1}>
                {entry.teamName}
              </Text>
              <Text style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
                {entry.time} · vs {entry.opponent}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: {
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  scrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 220,
  },
  crest: {
    width: 22,
    height: 22,
  },
  crestPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  chipText: {
    flexShrink: 1,
  },
  team: {
    fontSize: 12,
    fontWeight: '700',
  },
  meta: {
    fontSize: 10,
    marginTop: 1,
  },
});
