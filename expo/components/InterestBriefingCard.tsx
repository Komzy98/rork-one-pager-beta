import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell, Check, ChevronRight, Radio, Trophy } from 'lucide-react-native';
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

function SignalIcon({ signal, accent }: { signal: PersonalSignal; accent: string }) {
  if (signal.kind === 'football_live') {
    return <Radio size={17} color="#EF4444" strokeWidth={2.4} />;
  }
  if (signal.kind === 'football_recent_result') {
    return <Trophy size={17} color={accent} strokeWidth={2.2} />;
  }
  return <Bell size={17} color={accent} strokeWidth={2.2} />;
}

export default function InterestBriefingCard({
  signals,
  onOpenSignal,
  onViewAll,
  onRemind,
}: Props) {
  const { colors, isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  const signal = signals[0];
  if (!signal) return null;

  const remaining = Math.max(0, signals.length - 1);
  const canRemind = signal.kind === 'football_upcoming' && Boolean(onRemind);
  const live = signal.kind === 'football_live';

  const haptic = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };

  const open = () => {
    haptic();
    onOpenSignal(signal);
  };

  const remind = async () => {
    if (!onRemind || busy || reminderSet) return;
    haptic();
    setBusy(true);
    try {
      const ok = await onRemind(signal);
      if (ok) setReminderSet(true);
    } catch (error) {
      console.warn('[InterestBriefing] Failed to set reminder', error);
      Alert.alert('Couldn’t set reminder', 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: isDark ? colors.surfaceSecondary : 'rgba(255,255,255,0.84)',
          borderColor: isDark ? colors.border : 'rgba(22,34,55,0.08)',
        },
      ]}
      testID="interest-briefing-compact"
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${signal.title}`}
        activeOpacity={0.76}
        onPress={open}
        style={styles.main}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: live
                ? 'rgba(239,68,68,0.10)'
                : isDark
                  ? 'rgba(129,140,248,0.14)'
                  : 'rgba(79,70,229,0.08)',
            },
          ]}
        >
          <SignalIcon signal={signal} accent={colors.primary} />
        </View>

        <View style={styles.copy}>
          <View style={styles.metaRow}>
            <Text style={[styles.kicker, { color: colors.textTertiary }]}>
              {live ? 'LIVE NOW' : signal.kind === 'football_recent_result' ? 'RECENT' : 'COMING UP'}
            </Text>
            {remaining > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`View ${remaining} more interest update${remaining === 1 ? '' : 's'}`}
                activeOpacity={0.7}
                onPress={(event) => {
                  event.stopPropagation();
                  haptic();
                  onViewAll();
                }}
                style={[
                  styles.morePill,
                  { backgroundColor: isDark ? colors.surface : '#F3F4F6' },
                ]}
              >
                <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                  +{remaining}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {signal.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {signal.subtitle}
          </Text>
        </View>

        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.1} />
      </TouchableOpacity>

      {canRemind ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={reminderSet ? 'Reminder set' : `Remind me about ${signal.title}`}
          disabled={busy || reminderSet}
          activeOpacity={0.72}
          onPress={() => void remind()}
          style={[
            styles.reminderButton,
            {
              backgroundColor: reminderSet
                ? '#16A34A'
                : isDark
                  ? 'rgba(99,102,241,0.18)'
                  : 'rgba(79,70,229,0.08)',
              borderColor: reminderSet
                ? '#16A34A'
                : isDark
                  ? 'rgba(129,140,248,0.28)'
                  : 'rgba(79,70,229,0.12)',
            },
          ]}
          testID={`interest-remind-${signal.id}`}
        >
          {busy ? (
            <ActivityIndicator size="small" color={reminderSet ? '#FFFFFF' : colors.primary} />
          ) : reminderSet ? (
            <>
              <Check size={13} color="#FFFFFF" strokeWidth={2.8} />
              <Text style={styles.reminderSetText}>Reminder set</Text>
            </>
          ) : (
            <>
              <Bell size={13} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.reminderText, { color: colors.primary }]}>Remind me</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  main: {
    minHeight: 60,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  kicker: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  morePill: {
    minWidth: 24,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
    fontWeight: '500',
  },
  reminderButton: {
    alignSelf: 'flex-start',
    marginLeft: 51,
    marginTop: 8,
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  reminderText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
  },
  reminderSetText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
