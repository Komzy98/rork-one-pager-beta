import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Pin,
  Radio,
  Trophy,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import type { PersonalSignal } from '@/utils/interestSignalEngine';

interface Props {
  signals: readonly PersonalSignal[];
  onOpenSignal: (signal: PersonalSignal) => void;
  onViewAll: () => void;
  onRemind?: (signal: PersonalSignal) => Promise<boolean>;
  onTogglePin?: (signal: PersonalSignal) => Promise<void> | void;
  isPinned?: (signal: PersonalSignal) => boolean;
}

function SignalIcon({ signal }: { signal: PersonalSignal }) {
  if (signal.kind === 'football_live') {
    return <Radio size={18} color="#EF4444" strokeWidth={2.4} />;
  }
  if (signal.kind === 'football_recent_result') {
    return <Trophy size={18} color="#5B5BD6" strokeWidth={2.2} />;
  }
  return <BellRing size={18} color="#5B5BD6" strokeWidth={2.2} />;
}

export default function InterestBriefingCard({
  signals,
  onOpenSignal,
  onViewAll,
  onRemind,
  onTogglePin,
  isPinned,
}: Props) {
  const { colors, isDark } = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  const visibleSignals = useMemo(() => signals.slice(0, 4), [signals]);
  if (visibleSignals.length === 0) return null;

  const press = async (fn: () => void | Promise<void>) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await fn();
  };

  const handleRemind = async (signal: PersonalSignal) => {
    if (!onRemind || busyId) return;
    setBusyId(signal.id);
    try {
      const success = await onRemind(signal);
      if (success) {
        setRemindedIds((current) => new Set(current).add(signal.id));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surfaceSecondary : 'rgba(255,255,255,0.96)',
          borderColor: isDark ? colors.border : 'rgba(22,34,55,0.08)',
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>YOUR INTERESTS</Text>
          <Text style={[styles.title, { color: colors.text }]}>Worth knowing</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="View all sports interests"
          activeOpacity={0.7}
          onPress={() => void press(onViewAll)}
          style={[styles.viewAllButton, { backgroundColor: isDark ? colors.surface : '#F4F6FA' }]}
        >
          <Text style={styles.viewAllText}>View all</Text>
          <ChevronRight size={14} color="#4F46E5" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {visibleSignals.map((signal, index) => {
          const pinned = isPinned?.(signal) ?? false;
          const reminded = remindedIds.has(signal.id);
          const canRemind = signal.kind === 'football_upcoming' && Boolean(onRemind);
          const busy = busyId === signal.id;

          return (
            <View
              key={signal.id}
              style={[
                styles.rowShell,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: isDark ? colors.border : 'rgba(22,34,55,0.08)',
                },
              ]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Open details for ${signal.title}`}
                activeOpacity={0.72}
                onPress={() => void press(() => onOpenSignal(signal))}
                style={styles.rowMain}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        signal.kind === 'football_live'
                          ? 'rgba(239,68,68,0.09)'
                          : 'rgba(79,70,229,0.08)',
                    },
                  ]}
                >
                  <SignalIcon signal={signal} />
                </View>

                <View style={styles.copy}>
                  <View style={styles.titleLine}>
                    <Text style={[styles.signalTitle, { color: colors.text }]} numberOfLines={1}>
                      {signal.title}
                    </Text>
                    {signal.kind === 'football_live' ? (
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {signal.subtitle}
                  </Text>
                  <Text style={[styles.reason, { color: colors.textTertiary }]} numberOfLines={1}>
                    {signal.reason}
                  </Text>
                </View>

                <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.1} />
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${signal.title} details`}
                  activeOpacity={0.68}
                  onPress={() => void press(() => onOpenSignal(signal))}
                  style={[styles.actionButton, { backgroundColor: isDark ? colors.surface : '#F4F6FA' }]}
                >
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>Details</Text>
                </TouchableOpacity>

                {canRemind ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={reminded ? 'Reminder set' : `Remind me about ${signal.title}`}
                    disabled={busy || reminded}
                    activeOpacity={0.68}
                    onPress={() => void press(() => handleRemind(signal))}
                    style={[
                      styles.actionButton,
                      styles.primaryAction,
                      reminded && styles.successAction,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : reminded ? (
                      <>
                        <Check size={13} color="#FFFFFF" strokeWidth={2.8} />
                        <Text style={styles.primaryActionText}>Reminder set</Text>
                      </>
                    ) : (
                      <>
                        <Bell size={13} color="#FFFFFF" strokeWidth={2.3} />
                        <Text style={styles.primaryActionText}>Remind me</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : onTogglePin ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={pinned ? `Unpin ${signal.title}` : `Pin ${signal.title}`}
                    activeOpacity={0.68}
                    onPress={() => void press(async () => {
                      await onTogglePin(signal);
                    })}
                    style={[
                      styles.actionButton,
                      pinned && styles.pinnedAction,
                      { backgroundColor: pinned ? 'rgba(245,158,11,0.12)' : isDark ? colors.surface : '#F4F6FA' },
                    ]}
                  >
                    <Pin
                      size={13}
                      color={pinned ? '#D97706' : colors.textSecondary}
                      fill={pinned ? '#F59E0B' : 'transparent'}
                    />
                    <Text style={[styles.actionText, { color: pinned ? '#D97706' : colors.textSecondary }]}>
                      {pinned ? 'Pinned' : 'Pin'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {signals.length > visibleSignals.length ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View ${signals.length - visibleSignals.length} more interest updates`}
          activeOpacity={0.7}
          onPress={() => void press(onViewAll)}
          style={[styles.moreRow, { borderTopColor: isDark ? colors.border : 'rgba(22,34,55,0.08)' }]}
        >
          <Text style={styles.moreText}>See {signals.length - visibleSignals.length} more</Text>
          <ChevronRight size={15} color="#4F46E5" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.15,
  },
  title: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.55,
    marginTop: 1,
  },
  viewAllButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  list: {
    paddingHorizontal: 18,
  },
  rowShell: {
    paddingVertical: 13,
  },
  rowMain: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  signalTitle: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '750',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    fontWeight: '500',
  },
  reason: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
    fontWeight: '500',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.10)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.35,
  },
  actions: {
    marginLeft: 54,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
  },
  primaryAction: {
    backgroundColor: '#4F46E5',
  },
  successAction: {
    backgroundColor: '#16A34A',
  },
  pinnedAction: {
    borderWidth: 0,
  },
  primaryActionText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '750',
    color: '#FFFFFF',
  },
  moreRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 46,
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  moreText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
