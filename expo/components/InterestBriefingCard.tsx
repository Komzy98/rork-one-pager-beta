import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BellRing, ChevronRight, Radio, Trophy } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { PersonalSignal } from '@/utils/interestSignalEngine';

interface Props {
  signals: readonly PersonalSignal[];
  onOpenSignal?: (signal: PersonalSignal) => void;
}

function SignalIcon({ signal }: { signal: PersonalSignal }) {
  const color = signal.kind === 'football_live' ? '#EF4444' : '#6366F1';
  if (signal.kind === 'football_live') {
    return <Radio size={17} color={color} strokeWidth={2.5} />;
  }
  if (signal.kind === 'football_recent_result') {
    return <Trophy size={17} color={color} strokeWidth={2.4} />;
  }
  return <BellRing size={17} color={color} strokeWidth={2.4} />;
}

export default function InterestBriefingCard({ signals, onOpenSignal }: Props) {
  const { colors, isDark } = useTheme();
  if (signals.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surfaceSecondary : '#FFFFFF',
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>YOUR INTERESTS</Text>
          <Text style={[styles.title, { color: colors.text }]}>Worth knowing</Text>
        </View>
        <Text style={[styles.count, { color: colors.textTertiary }]}>{signals.length}</Text>
      </View>

      <View style={styles.list}>
        {signals.map((signal, index) => (
          <TouchableOpacity
            key={signal.id}
            activeOpacity={0.72}
            onPress={() => onOpenSignal?.(signal)}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor:
                    signal.kind === 'football_live'
                      ? 'rgba(239,68,68,0.10)'
                      : 'rgba(99,102,241,0.10)',
                },
              ]}
            >
              <SignalIcon signal={signal} />
            </View>

            <View style={styles.copy}>
              <Text style={[styles.signalTitle, { color: colors.text }]} numberOfLines={1}>
                {signal.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                {signal.subtitle}
              </Text>
              <Text style={[styles.reason, { color: colors.textTertiary }]} numberOfLines={1}>
                {signal.reason}
              </Text>
            </View>

            <ChevronRight size={17} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 18,
    marginTop: 14,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 14,
  },
  row: {
    minHeight: 76,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  signalTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  reason: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
});
