import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

  // Today should stay scannable. Deeper browsing belongs in Sports.
  const visibleSignals = useMemo(() => signals.slice(0, 3), [signals]);
  if (visibleSignals.length === 0) return null;

  const haptic = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };

  const press = async (fn: () => void | Promise<void>) => {
    haptic();
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
    } catch (error) {
      console.warn('[InterestBriefing] Failed to set reminder', error);
      Alert.alert('Couldn’t set reminder', 'Please try again in a moment.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePin = async (signal: PersonalSignal) => {
    if (!onTogglePin || busyId) return;
    setBusyId(signal.id);
    try {
      await onTogglePin(signal);
    } catch (error) {
      console.warn('[InterestBriefing] Failed to update pin', error);
      Alert.alert('Couldn’t update pin', 'Please try again in a moment.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>YOUR INTERESTS</Text>
          <Text style={[styles.title, { color: colors.text }]}>Worth knowing</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="View all sports interests"
          activeOpacity={0.72}
          onPress={() => void press(onViewAll)}
          style={[
            styles.viewAllButton,
            { backgroundColor: isDark ? colors.surfaceSecondary : '#F4F6FA' },
          ]}
          testID="interest-briefing-view-all"
        >
          <Text style={styles.viewAllText}>View all</Text>
          <ChevronRight size={15} color="#4F46E5" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {visibleSignals.map((signal) => {
          const pinned = isPinned?.(signal) ?? false;
          const reminded = remindedIds.has(signal.id);
          const canRemind = signal.kind === 'football_upcoming' && Boolean(onRemind);
          const busy = busyId === signal.id;
          const live = signal.kind === 'football_live';

          return (
            <View
              key={signal.id}
              style={[
                styles.signalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: live
                    ? isDark
                      ? 'rgba(248,113,113,0.28)'
                      : 'rgba(239,68,68,0.16)'
                    : colors.border,
                },
              ]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Open details for ${signal.title}`}
                activeOpacity={0.78}
                onPress={() => void press(() => onOpenSignal(signal))}
                style={styles.rowMain}
                testID={`interest-signal-${signal.id}`}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: live
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
                    {live ? (
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[styles.subtitle, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
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
                  activeOpacity={0.7}
                  onPress={() => void press(() => onOpenSignal(signal))}
                  style={[
                    styles.actionButton,
                    styles.secondaryAction,
                    {
                      backgroundColor: isDark ? colors.surfaceSecondary : '#F5F6F8',
                      borderColor: isDark ? colors.border : 'rgba(22,34,55,0.06)',
                    },
                  ]}
                  testID={`interest-details-${signal.id}`}
                >
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>Details</Text>
                </TouchableOpacity>

                {canRemind ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={reminded ? 'Reminder set' : `Remind me about ${signal.title}`}
                    accessibilityState={{ disabled: busy || reminded }}
                    disabled={busy || reminded}
                    activeOpacity={0.72}
                    onPress={() => void press(() => handleRemind(signal))}
                    style={[
                      styles.actionButton,
                      styles.primaryAction,
                      reminded && styles.successAction,
                      (busy || reminded) && styles.disabledAction,
                    ]}
                    testID={`interest-remind-${signal.id}`}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : reminded ? (
                      <>
                        <Check size={14} color="#FFFFFF" strokeWidth={2.8} />
                        <Text style={styles.primaryActionText}>Reminder set</Text>
                      </>
                    ) : (
                      <>
                        <Bell size={14} color="#FFFFFF" strokeWidth={2.3} />
                        <Text style={styles.primaryActionText}>Remind me</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : onTogglePin ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={pinned ? `Unpin ${signal.title}` : `Pin ${signal.title}`}
                    accessibilityState={{ busy }}
                    disabled={busy}
                    activeOpacity={0.72}
                    onPress={() => void press(() => handlePin(signal))}
                    style={[
                      styles.actionButton,
                      styles.pinAction,
                      {
                        backgroundColor: pinned
                          ? 'rgba(245,158,11,0.12)'
                          : isDark
                            ? colors.surfaceSecondary
                            : '#F5F6F8',
                        borderColor: pinned
                          ? 'rgba(217,119,6,0.18)'
                          : isDark
                            ? colors.border
                            : 'rgba(22,34,55,0.06)',
                      },
                    ]}
                    testID={`interest-pin-${signal.id}`}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={pinned ? '#D97706' : colors.textSecondary} />
                    ) : (
                      <>
                        <Pin
                          size={14}
                          color={pinned ? '#D97706' : colors.textSecondary}
                          fill={pinned ? '#F59E0B' : 'transparent'}
                        />
                        <Text
                          style={[
                            styles.actionText,
                            { color: pinned ? '#D97706' : colors.textSecondary },
                          ]}
                        >
                          {pinned ? 'Pinned' : 'Pin'}
                        </Text>
                      </>
                    )}
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
          activeOpacity={0.72}
          onPress={() => void press(onViewAll)}
          style={styles.moreRow}
          testID="interest-briefing-more"
        >
          <Text style={[styles.moreText, { color: colors.primary }]}>
            See {signals.length - visibleSignals.length} more
          </Text>
          <ChevronRight size={15} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 10,
  },
  header: {
    minHeight: 48,
    paddingHorizontal: 2,
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
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.45,
    marginTop: 1,
  },
  viewAllButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  viewAllText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '750',
    color: '#4F46E5',
  },
  list: {
    gap: 9,
  },
  signalCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.035,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  rowMain: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: '750',
    letterSpacing: -0.18,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
    fontWeight: '500',
  },
  reason: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    fontWeight: '500',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
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
    marginLeft: 51,
    paddingTop: 9,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryAction: {
    borderWidth: 1,
  },
  pinAction: {
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  primaryAction: {
    minWidth: 112,
    backgroundColor: '#4F46E5',
  },
  successAction: {
    backgroundColor: '#16A34A',
  },
  disabledAction: {
    opacity: 0.78,
  },
  primaryActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '750',
    color: '#FFFFFF',
  },
  moreRow: {
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  moreText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
  },
});
